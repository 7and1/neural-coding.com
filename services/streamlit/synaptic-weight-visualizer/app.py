import numpy as np
import matplotlib.pyplot as plt
import streamlit as st
import pandas as pd
from io import BytesIO


st.set_page_config(page_title="Synaptic Weight Visualizer", page_icon="🧬", layout="wide")
st.title("🧬 Synaptic Weight Visualizer")
st.markdown("Visualize Hebbian learning and STDP weight updates in real-time")

# Sidebar parameters
st.sidebar.header("STDP Parameters")
learning_mode = st.sidebar.selectbox("Learning Rule", ["STDP", "Simple Hebbian", "BCM"])

if learning_mode == "STDP":
    learning_rate = st.sidebar.slider("Learning Rate (η)", 0.001, 0.1, 0.01, 0.001)
    tau_plus = st.sidebar.slider("τ+ (ms)", 5.0, 50.0, 20.0, 1.0)
    tau_minus = st.sidebar.slider("τ- (ms)", 5.0, 50.0, 20.0, 1.0)
    a_plus = st.sidebar.slider("A+ (potentiation)", 0.001, 0.1, 0.01, 0.001)
    a_minus = st.sidebar.slider("A- (depression)", 0.001, 0.1, 0.012, 0.001)
elif learning_mode == "Simple Hebbian":
    learning_rate = st.sidebar.slider("Learning Rate (η)", 0.001, 0.5, 0.05, 0.01)
else:  # BCM
    learning_rate = st.sidebar.slider("Learning Rate (η)", 0.001, 0.1, 0.01, 0.001)
    theta = st.sidebar.slider("Threshold (θ)", 0.1, 2.0, 1.0, 0.1)

w_min = st.sidebar.slider("Min Weight", -5.0, 0.0, -2.0, 0.1)
w_max = st.sidebar.slider("Max Weight", 0.0, 5.0, 2.0, 0.1)

st.sidebar.header("Network Configuration")
n_pre = st.sidebar.number_input("Pre-synaptic neurons", 2, 50, 10, 1)
n_post = st.sidebar.number_input("Post-synaptic neurons", 2, 50, 10, 1)
simulation_time = st.sidebar.slider("Simulation time (ms)", 100, 2000, 500, 50)
dt = st.sidebar.slider("Time step (ms)", 0.1, 2.0, 1.0, 0.1)

st.sidebar.header("Spike Generation")
spike_mode = st.sidebar.selectbox("Spike Pattern", ["Poisson", "Regular", "Correlated"])
if spike_mode == "Poisson":
    pre_rate = st.sidebar.slider("Pre-synaptic rate (Hz)", 1.0, 100.0, 20.0, 1.0)
    post_rate = st.sidebar.slider("Post-synaptic rate (Hz)", 1.0, 100.0, 20.0, 1.0)
elif spike_mode == "Regular":
    pre_interval = st.sidebar.slider("Pre-synaptic interval (ms)", 10.0, 200.0, 50.0, 5.0)
    post_interval = st.sidebar.slider("Post-synaptic interval (ms)", 10.0, 200.0, 50.0, 5.0)
else:  # Correlated
    base_rate = st.sidebar.slider("Base rate (Hz)", 1.0, 100.0, 20.0, 1.0)
    correlation = st.sidebar.slider("Correlation", 0.0, 1.0, 0.5, 0.05)


def generate_poisson_spikes(rate_hz, duration_ms, dt_ms, n_neurons):
    """Generate Poisson spike trains"""
    n_steps = int(duration_ms / dt_ms)
    prob = rate_hz * dt_ms / 1000.0
    spikes = np.random.rand(n_steps, n_neurons) < prob
    return spikes.astype(np.float32)


def generate_regular_spikes(interval_ms, duration_ms, dt_ms, n_neurons):
    """Generate regular spike trains"""
    n_steps = int(duration_ms / dt_ms)
    spikes = np.zeros((n_steps, n_neurons), dtype=np.float32)
    interval_steps = int(interval_ms / dt_ms)
    for i in range(n_neurons):
        offset = np.random.randint(0, interval_steps)
        spikes[offset::interval_steps, i] = 1.0
    return spikes


def generate_correlated_spikes(rate_hz, correlation, duration_ms, dt_ms, n_neurons):
    """Generate correlated spike trains"""
    n_steps = int(duration_ms / dt_ms)
    prob = rate_hz * dt_ms / 1000.0

    # Shared component
    shared = np.random.rand(n_steps, 1) < prob
    # Independent component
    independent = np.random.rand(n_steps, n_neurons) < prob

    # Mix based on correlation
    spikes = (correlation * shared + (1 - correlation) * independent) > 0.5
    return spikes.astype(np.float32)


def stdp_learning(pre_spikes, post_spikes, w_init, eta, tau_plus, tau_minus, a_plus, a_minus, w_min, w_max, dt):
    """STDP learning rule"""
    n_steps, n_pre = pre_spikes.shape
    _, n_post = post_spikes.shape

    W = np.copy(w_init)
    W_history = [W.copy()]

    # Traces
    pre_trace = np.zeros(n_pre)
    post_trace = np.zeros(n_post)

    for t in range(n_steps):
        # Update traces
        pre_trace *= np.exp(-dt / tau_plus)
        post_trace *= np.exp(-dt / tau_minus)

        # Pre-synaptic spike
        pre_spike_idx = np.where(pre_spikes[t] > 0)[0]
        for i in pre_spike_idx:
            pre_trace[i] += 1.0
            # Depression: pre after post
            W[i, :] -= eta * a_minus * post_trace

        # Post-synaptic spike
        post_spike_idx = np.where(post_spikes[t] > 0)[0]
        for j in post_spike_idx:
            post_trace[j] += 1.0
            # Potentiation: post after pre
            W[:, j] += eta * a_plus * pre_trace

        # Clip weights
        W = np.clip(W, w_min, w_max)
        W_history.append(W.copy())

    return np.array(W_history)


def hebbian_learning(pre_spikes, post_spikes, w_init, eta, w_min, w_max):
    """Simple Hebbian learning: Δw = η * pre * post"""
    n_steps, n_pre = pre_spikes.shape
    _, n_post = post_spikes.shape

    W = np.copy(w_init)
    W_history = [W.copy()]

    for t in range(n_steps):
        if pre_spikes[t].sum() > 0 and post_spikes[t].sum() > 0:
            dW = eta * np.outer(pre_spikes[t], post_spikes[t])
            W += dW
            W = np.clip(W, w_min, w_max)
        W_history.append(W.copy())

    return np.array(W_history)


def bcm_learning(pre_spikes, post_spikes, w_init, eta, theta, w_min, w_max, dt):
    """BCM learning rule"""
    n_steps, n_pre = pre_spikes.shape
    _, n_post = post_spikes.shape

    W = np.copy(w_init)
    W_history = [W.copy()]

    post_activity = np.zeros(n_post)
    tau_avg = 100.0  # ms

    for t in range(n_steps):
        # Update running average of post-synaptic activity
        post_activity *= np.exp(-dt / tau_avg)
        post_activity += post_spikes[t]

        # BCM rule: Δw = η * pre * post * (post - θ)
        if pre_spikes[t].sum() > 0 and post_spikes[t].sum() > 0:
            phi = post_spikes[t] * (post_spikes[t] - theta)
            dW = eta * np.outer(pre_spikes[t], phi)
            W += dW
            W = np.clip(W, w_min, w_max)

        W_history.append(W.copy())

    return np.array(W_history)


# Main content
col1, col2 = st.columns([1, 1])

with col1:
    st.subheader("Spike Train Generation")

    if st.button("🚀 Run Simulation", type="primary", use_container_width=True):
        with st.spinner("Generating spikes and computing weight updates..."):
            # Generate spike trains
            if spike_mode == "Poisson":
                pre_spikes = generate_poisson_spikes(pre_rate, simulation_time, dt, n_pre)
                post_spikes = generate_poisson_spikes(post_rate, simulation_time, dt, n_post)
            elif spike_mode == "Regular":
                pre_spikes = generate_regular_spikes(pre_interval, simulation_time, dt, n_pre)
                post_spikes = generate_regular_spikes(post_interval, simulation_time, dt, n_post)
            else:  # Correlated
                pre_spikes = generate_correlated_spikes(base_rate, correlation, simulation_time, dt, n_pre)
                post_spikes = generate_correlated_spikes(base_rate, correlation, simulation_time, dt, n_post)

            # Initialize weights
            w_init = np.random.uniform(-0.1, 0.1, (n_pre, n_post))

            # Apply learning rule
            if learning_mode == "STDP":
                W_history = stdp_learning(pre_spikes, post_spikes, w_init, learning_rate,
                                         tau_plus, tau_minus, a_plus, a_minus, w_min, w_max, dt)
            elif learning_mode == "Simple Hebbian":
                W_history = hebbian_learning(pre_spikes, post_spikes, w_init, learning_rate, w_min, w_max)
            else:  # BCM
                W_history = bcm_learning(pre_spikes, post_spikes, w_init, learning_rate, theta, w_min, w_max, dt)

            # Store in session state
            st.session_state['W_history'] = W_history
            st.session_state['pre_spikes'] = pre_spikes
            st.session_state['post_spikes'] = post_spikes
            st.session_state['simulation_time'] = simulation_time
            st.session_state['dt'] = dt

        st.success("✅ Simulation complete!")

with col2:
    st.subheader("Statistics")
    if 'pre_spikes' in st.session_state:
        pre_spikes = st.session_state['pre_spikes']
        post_spikes = st.session_state['post_spikes']

        col_a, col_b, col_c = st.columns(3)
        with col_a:
            st.metric("Pre-synaptic spikes", int(pre_spikes.sum()))
        with col_b:
            st.metric("Post-synaptic spikes", int(post_spikes.sum()))
        with col_c:
            pre_rate_actual = pre_spikes.sum() / (simulation_time / 1000.0) / n_pre
            st.metric("Avg rate (Hz)", f"{pre_rate_actual:.1f}")

# Visualization
if 'W_history' in st.session_state:
    st.divider()
    st.subheader("📊 Weight Evolution")

    W_history = st.session_state['W_history']

    tab1, tab2, tab3, tab4 = st.tabs(["Weight Matrix", "Weight Evolution", "Spike Raster", "Weight Distribution"])

    with tab1:
        st.markdown("**Final Weight Matrix Heatmap**")
        time_step = st.slider("Time step", 0, len(W_history) - 1, len(W_history) - 1, 1)

        fig, ax = plt.subplots(figsize=(8, 6))
        im = ax.imshow(W_history[time_step], cmap='RdBu_r', aspect='auto',
                       vmin=w_min, vmax=w_max)
        ax.set_xlabel('Post-synaptic neuron')
        ax.set_ylabel('Pre-synaptic neuron')
        ax.set_title(f'Weight Matrix at t={time_step * dt:.1f}ms')
        plt.colorbar(im, ax=ax, label='Weight')
        st.pyplot(fig)

    with tab2:
        st.markdown("**Weight Evolution Over Time**")

        # Select specific synapses to track
        synapse_indices = st.multiselect(
            "Select synapses to track (pre, post)",
            options=[f"({i},{j})" for i in range(min(5, n_pre)) for j in range(min(5, n_post))],
            default=[f"({i},{j})" for i in range(min(3, n_pre)) for j in range(min(3, n_post))]
        )

        if synapse_indices:
            fig, ax = plt.subplots(figsize=(10, 5))
            time_axis = np.arange(len(W_history)) * dt

            for syn in synapse_indices:
                i, j = map(int, syn.strip('()').split(','))
                weights = W_history[:, i, j]
                ax.plot(time_axis, weights, label=f'W[{i},{j}]', alpha=0.7)

            ax.set_xlabel('Time (ms)')
            ax.set_ylabel('Weight')
            ax.set_title('Synaptic Weight Evolution')
            ax.legend()
            ax.grid(True, alpha=0.3)
            st.pyplot(fig)

        # Mean weight evolution
        st.markdown("**Mean Weight Statistics**")
        fig, ax = plt.subplots(figsize=(10, 4))
        time_axis = np.arange(len(W_history)) * dt
        mean_weights = W_history.mean(axis=(1, 2))
        std_weights = W_history.std(axis=(1, 2))

        ax.plot(time_axis, mean_weights, 'b-', label='Mean', linewidth=2)
        ax.fill_between(time_axis, mean_weights - std_weights, mean_weights + std_weights,
                        alpha=0.3, label='±1 std')
        ax.set_xlabel('Time (ms)')
        ax.set_ylabel('Weight')
        ax.set_title('Mean Weight Evolution')
        ax.legend()
        ax.grid(True, alpha=0.3)
        st.pyplot(fig)

    with tab3:
        st.markdown("**Spike Raster Plot**")

        pre_spikes = st.session_state['pre_spikes']
        post_spikes = st.session_state['post_spikes']

        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 6), sharex=True)

        # Pre-synaptic raster
        time_axis = np.arange(len(pre_spikes)) * dt
        for i in range(min(n_pre, 20)):
            spike_times = time_axis[pre_spikes[:, i] > 0]
            ax1.scatter(spike_times, [i] * len(spike_times), s=1, c='blue', alpha=0.6)
        ax1.set_ylabel('Pre-synaptic neuron')
        ax1.set_title('Pre-synaptic Spikes')
        ax1.set_ylim(-0.5, min(n_pre, 20) - 0.5)

        # Post-synaptic raster
        for j in range(min(n_post, 20)):
            spike_times = time_axis[post_spikes[:, j] > 0]
            ax2.scatter(spike_times, [j] * len(spike_times), s=1, c='red', alpha=0.6)
        ax2.set_ylabel('Post-synaptic neuron')
        ax2.set_xlabel('Time (ms)')
        ax2.set_title('Post-synaptic Spikes')
        ax2.set_ylim(-0.5, min(n_post, 20) - 0.5)

        plt.tight_layout()
        st.pyplot(fig)

    with tab4:
        st.markdown("**Weight Distribution**")

        col_a, col_b = st.columns(2)

        with col_a:
            fig, ax = plt.subplots(figsize=(6, 4))
            ax.hist(W_history[0].flatten(), bins=30, alpha=0.5, label='Initial', color='blue')
            ax.hist(W_history[-1].flatten(), bins=30, alpha=0.5, label='Final', color='red')
            ax.set_xlabel('Weight')
            ax.set_ylabel('Count')
            ax.set_title('Weight Distribution')
            ax.legend()
            st.pyplot(fig)

        with col_b:
            fig, ax = plt.subplots(figsize=(6, 4))
            weight_changes = W_history[-1] - W_history[0]
            ax.hist(weight_changes.flatten(), bins=30, color='green', alpha=0.7)
            ax.set_xlabel('Weight Change')
            ax.set_ylabel('Count')
            ax.set_title('Weight Change Distribution')
            ax.axvline(0, color='black', linestyle='--', linewidth=1)
            st.pyplot(fig)

    # Export functionality
    st.divider()
    st.subheader("💾 Export Data")

    col1, col2, col3 = st.columns(3)

    with col1:
        # Export final weight matrix
        final_weights = W_history[-1]
        df_weights = pd.DataFrame(final_weights,
                                  columns=[f'post_{j}' for j in range(n_post)],
                                  index=[f'pre_{i}' for i in range(n_pre)])

        csv_weights = df_weights.to_csv().encode('utf-8')
        st.download_button(
            label="📥 Download Weight Matrix (CSV)",
            data=csv_weights,
            file_name="weight_matrix.csv",
            mime="text/csv",
            use_container_width=True
        )

    with col2:
        # Export weight evolution
        weight_evolution = W_history.reshape(len(W_history), -1)
        df_evolution = pd.DataFrame(weight_evolution,
                                   columns=[f'W[{i},{j}]' for i in range(n_pre) for j in range(n_post)])
        df_evolution.insert(0, 'time_ms', np.arange(len(W_history)) * dt)

        csv_evolution = df_evolution.to_csv(index=False).encode('utf-8')
        st.download_button(
            label="📥 Download Weight Evolution (CSV)",
            data=csv_evolution,
            file_name="weight_evolution.csv",
            mime="text/csv",
            use_container_width=True
        )

    with col3:
        # Export spike trains
        df_spikes = pd.DataFrame({
            'time_ms': np.arange(len(pre_spikes)) * dt,
            **{f'pre_{i}': pre_spikes[:, i] for i in range(n_pre)},
            **{f'post_{j}': post_spikes[:, j] for j in range(n_post)}
        })

        csv_spikes = df_spikes.to_csv(index=False).encode('utf-8')
        st.download_button(
            label="📥 Download Spike Trains (CSV)",
            data=csv_spikes,
            file_name="spike_trains.csv",
            mime="text/csv",
            use_container_width=True
        )

else:
    st.info("👆 Configure parameters in the sidebar and click 'Run Simulation' to start")

# Help section
with st.expander("ℹ️ Help & Information"):
    st.markdown("""
    ### Learning Rules

    **STDP (Spike-Timing-Dependent Plasticity)**
    - Potentiation: Post-synaptic spike follows pre-synaptic spike within τ+
    - Depression: Pre-synaptic spike follows post-synaptic spike within τ-
    - Biologically realistic timing-dependent learning

    **Simple Hebbian**
    - "Neurons that fire together, wire together"
    - Δw = η × pre × post
    - Simpler but less biologically accurate

    **BCM (Bienenstock-Cooper-Munro)**
    - Includes sliding threshold θ
    - Δw = η × pre × post × (post - θ)
    - Prevents runaway potentiation

    ### Parameters
    - **Learning Rate (η)**: Controls speed of weight changes
    - **τ+/τ-**: Time constants for STDP windows
    - **A+/A-**: Amplitude of potentiation/depression
    - **Weight Bounds**: Prevent weights from growing unbounded

    ### Spike Patterns
    - **Poisson**: Random spikes with specified rate
    - **Regular**: Periodic spikes with fixed interval
    - **Correlated**: Spikes with temporal correlation between neurons
    """)
