import numpy as np
import matplotlib.pyplot as plt
import streamlit as st


st.set_page_config(page_title="LIF-Explorer", page_icon="🧠", layout="wide")
st.title("LIF-Explorer (Leaky Integrate-and-Fire)")
st.caption("交互式 LIF 神经元模型：膜电位积分 → 阈值触发 spike → reset。")

col1, col2 = st.columns([1, 2], gap="large")

with col1:
    st.subheader("Parameters")
    tau_ms = st.slider("tau (ms)", 1.0, 100.0, 20.0, 1.0)
    dt_ms = st.slider("dt (ms)", 0.05, 2.0, 0.1, 0.05)
    t_ms = st.slider("T (ms)", 50.0, 2000.0, 400.0, 10.0)

    v_rest = st.slider("V_rest", -1.0, 1.0, 0.0, 0.05)
    v_reset = st.slider("V_reset", -1.0, 1.0, 0.0, 0.05)
    v_th = st.slider("V_th", -1.0, 2.0, 1.0, 0.05)

    i_dc = st.slider("I (DC)", -1.0, 3.0, 1.2, 0.05)
    noise = st.slider("Noise (σ)", 0.0, 1.0, 0.08, 0.01)

    run = st.button("Run simulation", type="primary")


def simulate_lif(tau, dt, T, v_rest, v_reset, v_th, i_dc, noise_sigma):
    n = int(np.ceil(T / dt))
    t = np.arange(n) * dt
    v = np.zeros(n, dtype=np.float32)
    v[0] = v_rest
    spikes = np.zeros(n, dtype=np.int8)

    alpha = dt / tau
    for k in range(1, n):
        dv = alpha * (-(v[k - 1] - v_rest) + i_dc) + noise_sigma * np.sqrt(dt) * np.random.randn()
        v[k] = v[k - 1] + dv
        if v[k] >= v_th:
            spikes[k] = 1
            v[k] = v_reset
    return t, v, spikes


with col2:
    st.subheader("Output")
    if run:
        t, v, spikes = simulate_lif(
            tau=tau_ms,
            dt=dt_ms,
            T=t_ms,
            v_rest=v_rest,
            v_reset=v_reset,
            v_th=v_th,
            i_dc=i_dc,
            noise_sigma=noise,
        )

        fig = plt.figure(figsize=(10, 3))
        plt.plot(t, v, lw=1.5)
        plt.axhline(v_th, ls="--", lw=1, color="orange", label="V_th")
        plt.xlabel("time (ms)")
        plt.ylabel("V")
        plt.title("Membrane potential")
        plt.tight_layout()
        st.pyplot(fig, clear_figure=True)

        st.write("Spike count:", int(spikes.sum()))
        st.line_chart({"spikes": spikes.astype(np.float32)})
    else:
        st.info("设置参数后点击 Run simulation。")

