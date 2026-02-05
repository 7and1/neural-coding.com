import re
import streamlit as st
import json


st.set_page_config(page_title="Neural Code Transpiler", page_icon="🔄", layout="wide")
st.title("🔄 Neural Code Transpiler")
st.markdown("Convert pseudocode to Brian2, Norse, or SNNTorch with syntax validation")

# Sidebar - Framework selection and options
st.sidebar.header("Target Framework")
framework = st.sidebar.selectbox(
    "Select Framework",
    ["Brian2", "Norse", "SNNTorch"],
    help="Choose the target SNN framework for code generation"
)

st.sidebar.header("Code Generation Options")
include_comments = st.sidebar.checkbox("Include detailed comments", value=True)
include_visualization = st.sidebar.checkbox("Include visualization code", value=True)
include_imports = st.sidebar.checkbox("Include import statements", value=True)

st.sidebar.header("Validation")
validate_syntax = st.sidebar.checkbox("Validate syntax", value=True)
show_warnings = st.sidebar.checkbox("Show warnings", value=True)

# Example templates
EXAMPLES = {
    "LIF Neuron": """# LIF Neuron Model
tau_m = 10  # ms
V_rest = -70  # mV
V_threshold = -50  # mV
V_reset = -65  # mV
R = 10  # MOhm

# Membrane dynamics
dV/dt = (V_rest - V + R*I) / tau_m

# Spike condition
if V >= V_threshold:
    V = V_reset
    emit_spike()
""",
    "Izhikevich Neuron": """# Izhikevich Neuron
a = 0.02
b = 0.2
c = -65
d = 8

# Dynamics
dv/dt = 0.04*v^2 + 5*v + 140 - u + I
du/dt = a*(b*v - u)

# Spike and reset
if v >= 30:
    v = c
    u = u + d
    emit_spike()
""",
    "STDP Synapse": """# STDP Learning
tau_pre = 20  # ms
tau_post = 20  # ms
w_max = 1.0
A_plus = 0.01
A_minus = 0.012

# Trace dynamics
dtrace_pre/dt = -trace_pre / tau_pre
dtrace_post/dt = -trace_post / tau_post

# On pre-spike
on_pre:
    trace_pre += 1
    w = clip(w + A_plus * trace_post, 0, w_max)

# On post-spike
on_post:
    trace_post += 1
    w = clip(w - A_minus * trace_pre, 0, w_max)
""",
    "AdEx Neuron": """# Adaptive Exponential I&F
C = 281  # pF
g_L = 30  # nS
E_L = -70.6  # mV
V_T = -50.4  # mV
Delta_T = 2  # mV
tau_w = 144  # ms
a = 4  # nS
b = 0.0805  # nA

# Membrane equation
dV/dt = (-g_L*(V - E_L) + g_L*Delta_T*exp((V - V_T)/Delta_T) - w + I) / C

# Adaptation
dw/dt = (a*(V - E_L) - w) / tau_w

# Spike
if V >= V_threshold:
    V = V_reset
    w = w + b
    emit_spike()
"""
}

# Main layout
col1, col2 = st.columns([1, 1])

with col1:
    st.subheader("Input (Pseudocode)")

    # Example selector
    example_choice = st.selectbox(
        "Load Example",
        ["Custom"] + list(EXAMPLES.keys()),
        help="Select a pre-defined example or write custom pseudocode"
    )

    if example_choice != "Custom":
        default_code = EXAMPLES[example_choice]
    else:
        default_code = """# Custom Neuron Model
tau = 20.0  # ms
dt = 0.1  # ms
v_th = 1.0
v_reset = 0.0

# ODE
dv/dt = (I - v) / tau

# Spike condition
if v >= v_th:
    emit_spike()
    v = v_reset
"""

    pseudocode = st.text_area(
        "Enter pseudocode",
        value=default_code,
        height=400,
        help="Write your neuron model in simplified pseudocode"
    )


def extract_param(src: str, name: str, fallback: str = "1.0"):
    """Extract parameter value from pseudocode"""
    patterns = [
        rf"^{name}\s*=\s*([^#\n]+)",  # Standard assignment
        rf"{name}\s*:\s*([^#\n]+)",   # Colon notation
    ]
    for pattern in patterns:
        m = re.search(pattern, src, flags=re.MULTILINE | re.IGNORECASE)
        if m:
            return m.group(1).strip()
    return fallback


def extract_ode(src: str, var: str):
    """Extract ODE for a variable"""
    pattern = rf"d{var}/dt\s*=\s*([^#\n]+)"
    m = re.search(pattern, src, flags=re.IGNORECASE)
    return m.group(1).strip() if m else None


def validate_pseudocode(code: str):
    """Validate pseudocode and return errors/warnings"""
    errors = []
    warnings = []

    # Check for basic structure
    if not re.search(r'd\w+/dt', code, re.IGNORECASE):
        warnings.append("No differential equations found (dv/dt pattern)")

    if not re.search(r'if\s+\w+\s*[><=]', code, re.IGNORECASE):
        warnings.append("No spike condition found (if statement)")

    # Check for common mistakes
    if re.search(r'd\w+/dt\s*==', code):
        errors.append("Use '=' for ODE definition, not '=='")

    if re.search(r'emit_spike\(\)', code) and not re.search(r'if', code, re.IGNORECASE):
        warnings.append("emit_spike() found without conditional")

    # Check for undefined variables in ODEs
    odes = re.findall(r'd(\w+)/dt\s*=\s*([^#\n]+)', code, re.IGNORECASE)
    defined_vars = set(re.findall(r'^(\w+)\s*=', code, re.MULTILINE))

    for var, expr in odes:
        # Extract variables used in expression
        used_vars = set(re.findall(r'\b([a-zA-Z_]\w*)\b', expr))
        used_vars.discard(var)  # Remove the variable itself
        # Remove common functions
        used_vars -= {'exp', 'sin', 'cos', 'log', 'sqrt', 'abs', 'clip'}

        undefined = used_vars - defined_vars - {var}
        if undefined and show_warnings:
            warnings.append(f"Variables {undefined} used in d{var}/dt but not defined")

    return errors, warnings


def transpile_to_brian2(code: str, include_comments: bool, include_viz: bool, include_imports: bool):
    """Transpile to Brian2"""
    # Extract parameters
    tau = extract_param(code, "tau", "20.0")
    tau_m = extract_param(code, "tau_m", tau)
    dt = extract_param(code, "dt", "0.1")
    v_th = extract_param(code, "v_th|V_threshold|v_threshold", "1.0")
    v_reset = extract_param(code, "v_reset|V_reset", "0.0")
    v_rest = extract_param(code, "V_rest|v_rest|E_L", "-70")

    # Extract ODE
    v_ode = extract_ode(code, "v") or extract_ode(code, "V")
    if not v_ode:
        v_ode = f"(I - v) / ({tau_m}*ms)"

    # Convert pseudocode ODE to Brian2 format
    v_ode_brian = v_ode.replace("^", "**").replace("exp(", "exp(")

    output = []

    if include_imports:
        output.append("from brian2 import *\n")

    if include_comments:
        output.append("# Brian2 Neuron Model")
        output.append("# Generated from pseudocode\n")

    output.append(f"defaultclock.dt = {dt}*ms\n")

    if include_comments:
        output.append("# Neuron equations")

    # Build equations string
    output.append("eqs = '''")
    output.append(f"dv/dt = {v_ode_brian} : 1")

    # Check for adaptation variable
    if "dw/dt" in code.lower() or "du/dt" in code.lower():
        w_ode = extract_ode(code, "w") or extract_ode(code, "u")
        if w_ode:
            w_ode_brian = w_ode.replace("^", "**")
            output.append(f"dw/dt = {w_ode_brian} : 1")

    output.append("I : 1")
    output.append("'''\n")

    if include_comments:
        output.append("# Create neuron group")

    output.append(f"G = NeuronGroup(100, eqs,")
    output.append(f"                threshold='v >= {v_th}',")
    output.append(f"                reset='v = {v_reset}',")
    output.append(f"                method='euler')\n")

    if include_comments:
        output.append("# Initialize")
    output.append(f"G.v = {v_rest}")
    output.append("G.I = 1.2\n")

    if include_comments:
        output.append("# Monitors")
    output.append("M = StateMonitor(G, 'v', record=True)")
    output.append("S = SpikeMonitor(G)\n")

    if include_comments:
        output.append("# Run simulation")
    output.append("run(500*ms)\n")

    if include_viz:
        if include_comments:
            output.append("# Visualization")
        output.append("figure(figsize=(12, 4))")
        output.append("plot(M.t/ms, M.v[0], label='Neuron 0')")
        output.append("xlabel('Time (ms)')")
        output.append("ylabel('v')")
        output.append("title('Membrane Potential')")
        output.append("show()")
        output.append(f"\nprint(f'Total spikes: {{S.num_spikes}}')")

    return "\n".join(output)


def transpile_to_norse(code: str, include_comments: bool, include_viz: bool, include_imports: bool):
    """Transpile to Norse"""
    tau = extract_param(code, "tau|tau_m", "20.0")
    v_th = extract_param(code, "v_th|V_threshold", "1.0")

    output = []

    if include_imports:
        output.append("import torch")
        output.append("import norse.torch as norse")
        output.append("from norse.torch import LIFParameters\n")

    if include_comments:
        output.append("# Norse LIF Neuron Model")
        output.append("# Generated from pseudocode\n")

    output.append(f"# Parameters")
    output.append(f"tau_mem = {tau}  # ms")
    output.append(f"v_th = {v_th}\n")

    if include_comments:
        output.append("# Create LIF cell with parameters")

    output.append("lif_params = LIFParameters(")
    output.append(f"    tau_mem_inv=torch.tensor(1.0/{tau}),")
    output.append(f"    v_th=torch.tensor({v_th})")
    output.append(")")
    output.append("lif = norse.LIFCell(p=lif_params)\n")

    if include_comments:
        output.append("# Simulation setup")
    output.append("T = 500  # time steps")
    output.append("batch_size = 1")
    output.append("input_features = 10\n")

    if include_comments:
        output.append("# Initialize state")
    output.append("state = None")
    output.append("spikes_out = []\n")

    if include_comments:
        output.append("# Simulation loop")
    output.append("for t in range(T):")
    output.append("    # Input current (example: constant + noise)")
    output.append("    x = torch.ones(batch_size, input_features) * 1.2")
    output.append("    x += torch.randn_like(x) * 0.1")
    output.append("    ")
    output.append("    # Forward pass")
    output.append("    z, state = lif(x, state)")
    output.append("    spikes_out.append(z)\n")

    output.append("# Stack outputs")
    output.append("spikes_out = torch.stack(spikes_out)\n")

    if include_viz:
        if include_comments:
            output.append("# Visualization")
        output.append("import matplotlib.pyplot as plt")
        output.append("plt.figure(figsize=(12, 4))")
        output.append("plt.imshow(spikes_out[:, 0, :].T, aspect='auto', cmap='binary')")
        output.append("plt.xlabel('Time step')")
        output.append("plt.ylabel('Neuron')")
        output.append("plt.title('Spike Raster')")
        output.append("plt.colorbar(label='Spike')")
        output.append("plt.show()")

    output.append(f"\nprint(f'Total spikes: {{spikes_out.sum().item():.0f}}')")

    return "\n".join(output)


def transpile_to_snntorch(code: str, include_comments: bool, include_viz: bool, include_imports: bool):
    """Transpile to SNNTorch"""
    tau = extract_param(code, "tau|tau_m", "20.0")
    v_th = extract_param(code, "v_th|V_threshold", "1.0")
    v_reset = extract_param(code, "v_reset|V_reset", "0.0")
    beta = f"{1.0 - 1.0/float(tau):.4f}"  # Convert tau to beta

    output = []

    if include_imports:
        output.append("import torch")
        output.append("import snntorch as snn")
        output.append("from snntorch import surrogate\n")

    if include_comments:
        output.append("# SNNTorch LIF Neuron Model")
        output.append("# Generated from pseudocode\n")

    output.append(f"# Parameters")
    output.append(f"beta = {beta}  # decay rate (from tau={tau})")
    output.append(f"threshold = {v_th}")
    output.append(f"reset = {v_reset}\n")

    if include_comments:
        output.append("# Create LIF layer")
        output.append("# Using surrogate gradient for training compatibility")

    output.append("lif = snn.Leaky(")
    output.append(f"    beta=beta,")
    output.append(f"    threshold=threshold,")
    output.append("    spike_grad=surrogate.fast_sigmoid(),")
    output.append("    init_hidden=True,")
    output.append("    reset_mechanism='subtract'")
    output.append(")\n")

    if include_comments:
        output.append("# Simulation setup")
    output.append("num_steps = 500")
    output.append("batch_size = 1")
    output.append("num_neurons = 10\n")

    if include_comments:
        output.append("# Initialize membrane potential")
    output.append("mem = lif.init_leaky()\n")

    if include_comments:
        output.append("# Storage for outputs")
    output.append("spk_rec = []")
    output.append("mem_rec = []\n")

    if include_comments:
        output.append("# Simulation loop")
    output.append("for step in range(num_steps):")
    output.append("    # Input current (example)")
    output.append("    cur_in = torch.ones(batch_size, num_neurons) * 1.2")
    output.append("    cur_in += torch.randn_like(cur_in) * 0.1")
    output.append("    ")
    output.append("    # LIF dynamics")
    output.append("    spk, mem = lif(cur_in, mem)")
    output.append("    ")
    output.append("    # Record")
    output.append("    spk_rec.append(spk)")
    output.append("    mem_rec.append(mem)\n")

    output.append("# Stack recordings")
    output.append("spk_rec = torch.stack(spk_rec)")
    output.append("mem_rec = torch.stack(mem_rec)\n")

    if include_viz:
        if include_comments:
            output.append("# Visualization")
        output.append("import matplotlib.pyplot as plt")
        output.append("")
        output.append("fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 6))")
        output.append("")
        output.append("# Membrane potential")
        output.append("ax1.plot(mem_rec[:, 0, 0].detach().numpy())")
        output.append("ax1.set_ylabel('Membrane Potential')")
        output.append("ax1.set_title('Neuron 0 Dynamics')")
        output.append("ax1.axhline(threshold, color='r', linestyle='--', label='Threshold')")
        output.append("ax1.legend()")
        output.append("")
        output.append("# Spike raster")
        output.append("ax2.imshow(spk_rec[:, 0, :].T.detach().numpy(), aspect='auto', cmap='binary')")
        output.append("ax2.set_xlabel('Time step')")
        output.append("ax2.set_ylabel('Neuron')")
        output.append("ax2.set_title('Spike Raster')")
        output.append("")
        output.append("plt.tight_layout()")
        output.append("plt.show()")

    output.append(f"\nprint(f'Total spikes: {{spk_rec.sum().item():.0f}}')")

    return "\n".join(output)


with col2:
    st.subheader(f"Output ({framework})")

    # Validation
    if validate_syntax:
        errors, warnings = validate_pseudocode(pseudocode)

        if errors:
            for error in errors:
                st.error(f"❌ Error: {error}")

        if warnings and show_warnings:
            for warning in warnings:
                st.warning(f"⚠️ Warning: {warning}")

    # Transpile button
    if st.button("🔄 Transpile", type="primary", use_container_width=True):
        with st.spinner(f"Transpiling to {framework}..."):
            try:
                if framework == "Brian2":
                    output_code = transpile_to_brian2(pseudocode, include_comments, include_visualization, include_imports)
                elif framework == "Norse":
                    output_code = transpile_to_norse(pseudocode, include_comments, include_visualization, include_imports)
                else:  # SNNTorch
                    output_code = transpile_to_snntorch(pseudocode, include_comments, include_visualization, include_imports)

                st.session_state['output_code'] = output_code
                st.session_state['framework'] = framework
                st.success(f"✅ Successfully transpiled to {framework}!")

            except Exception as e:
                st.error(f"❌ Transpilation failed: {str(e)}")

    # Display output
    if 'output_code' in st.session_state:
        output_code = st.session_state['output_code']

        st.code(output_code, language="python", line_numbers=True)

        # Download button
        st.download_button(
            label=f"📥 Download {framework} Code",
            data=output_code,
            file_name=f"neuron_model_{framework.lower()}.py",
            mime="text/x-python",
            use_container_width=True
        )

        # Copy to clipboard (via text area)
        with st.expander("📋 Copy to Clipboard"):
            st.text_area("Select and copy", output_code, height=200)

# Information section
st.divider()

col_info1, col_info2, col_info3 = st.columns(3)

with col_info1:
    with st.expander("📖 Pseudocode Syntax"):
        st.markdown("""
        ### Supported Syntax

        **Parameters:**
        ```
        tau = 20.0  # ms
        v_th = 1.0
        ```

        **Differential Equations:**
        ```
        dv/dt = (I - v) / tau
        dw/dt = a*(b*v - w)
        ```

        **Spike Conditions:**
        ```
        if v >= v_th:
            emit_spike()
            v = v_reset
        ```

        **Mathematical Operations:**
        - Basic: `+`, `-`, `*`, `/`
        - Power: `^` or `**`
        - Functions: `exp()`, `sin()`, `cos()`, `log()`
        """)

with col_info2:
    with st.expander("🔧 Framework Differences"):
        st.markdown("""
        ### Brian2
        - Equation-based definition
        - Built-in units system
        - Flexible threshold/reset
        - Best for research prototyping

        ### Norse
        - PyTorch-based
        - GPU acceleration
        - Differentiable for training
        - Best for deep learning integration

        ### SNNTorch
        - PyTorch-based
        - Surrogate gradients
        - Training-focused
        - Best for learning SNNs
        """)

with col_info3:
    with st.expander("⚡ Quick Tips"):
        st.markdown("""
        ### Tips

        1. **Start Simple**: Use examples as templates
        2. **Name Conventions**: Use standard names (tau, v_th, etc.)
        3. **Units**: Include units in comments
        4. **Validation**: Enable syntax checking
        5. **Test**: Run generated code in target framework

        ### Common Issues
        - Missing parameters → Use defaults
        - Complex ODEs → May need manual adjustment
        - Framework-specific features → Check docs
        """)

# Advanced features
with st.expander("🔬 Advanced Features"):
    st.markdown("""
    ### Supported Neuron Models
    - Leaky Integrate-and-Fire (LIF)
    - Izhikevich
    - Adaptive Exponential (AdEx)
    - Hodgkin-Huxley (partial)

    ### Planned Features
    - STDP synapse transpilation
    - Network topology generation
    - Multi-compartment neurons
    - Custom learning rules
    - AST-based parsing for complex models

    ### Limitations
    - Currently supports single-neuron models
    - Complex mathematical expressions may need adjustment
    - Framework-specific optimizations not included
    - Manual verification recommended for production use
    """)

# Footer
st.divider()
st.caption("Neural Code Transpiler v1.0 | Supports Brian2, Norse, and SNNTorch")
