from __future__ import annotations

import json

import numpy as np
import plotly.graph_objects as go
import streamlit as st


st.set_page_config(page_title="Neural Coding Playground", layout="wide")

st.title("Neural Coding Playground")
st.caption("Streamlit UI for intuition; FastAPI endpoints exist for reproducible runs.")

tool = st.query_params.get("tool", "lif")

with st.sidebar:
    st.subheader("Tools")
    tool = st.radio(
        "Select",
        ["lif", "hebb"],
        index=0 if tool == "lif" else 1,
        format_func=lambda v: "LIF-Explorer" if v == "lif" else "Synaptic-Weight Visualizer",
    )

if tool == "lif":
    st.header("LIF-Explorer (Leaky Integrate-and-Fire)")

    c1, c2, c3 = st.columns(3)
    with c1:
        t_max = st.slider("t_max (s)", 0.2, 3.0, 1.0, 0.1)
        dt = st.select_slider("dt (s)", options=[0.0005, 0.001, 0.002, 0.005], value=0.001)
    with c2:
        R = st.slider("R (Ohm)", 1e6, 1e9, 1e7, step=1e6, format="%.0e")
        C = st.slider("C (F)", 1e-11, 1e-7, 1e-9, step=1e-11, format="%.0e")
    with c3:
        V_rest = st.slider("V_rest (V)", -0.090, -0.030, -0.070, 0.001)
        V_reset = st.slider("V_reset (V)", -0.090, -0.030, -0.075, 0.001)
        V_th = st.slider("V_th (V)", -0.080, -0.020, -0.050, 0.001)
        I = st.slider("I (A)", 0.0, 5e-9, 1e-9, step=1e-10, format="%.1e")

    # Minimal local simulation (the API is the "source of truth" for reproducible runs).
    n = int(np.floor(t_max / dt)) + 1
    t = np.linspace(0.0, t_max, n)
    v = np.empty_like(t)
    spikes = []

    V = V_rest
    v[0] = V
    for i in range(1, n):
        dV = (-(V - V_rest) / (R * C) + (I / C)) * dt
        V = V + dV
        if V >= V_th:
            spikes.append(t[i])
            V = V_reset
        v[i] = V

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=t, y=v, mode="lines", name="V(t)"))
    fig.add_hline(y=V_th, line_dash="dot", line_color="rgba(255,204,102,0.75)", annotation_text="V_th")
    fig.update_layout(
        height=420,
        template="plotly_dark",
        margin=dict(l=30, r=10, t=30, b=30),
        xaxis_title="t (s)",
        yaxis_title="V (V)",
    )

    st.plotly_chart(fig, use_container_width=True)
    st.write(f"Spikes: {len(spikes)}")

    st.subheader("Reproducible API payload")
    st.code(
        json.dumps(
            dict(dt=dt, t_max=t_max, R=R, C=C, V_rest=V_rest, V_reset=V_reset, V_th=V_th, I=I),
            indent=2,
        ),
        language="json",
    )

else:
    st.header("Synaptic-Weight Visualizer (Hebbian Learning)")
    st.write("Simple Hebbian update: `w <- clip(w + eta * pre * post)`")

    c1, c2, c3 = st.columns(3)
    with c1:
        w0 = st.slider("w0", 0.0, 1.0, 0.1, 0.01)
        eta = st.slider("eta", 0.0, 0.5, 0.02, 0.005)
    with c2:
        steps = st.slider("steps", 10, 400, 120, 10)
        pre = st.slider("pre (0..1)", 0.0, 1.0, 0.8, 0.01)
    with c3:
        post = st.slider("post (0..1)", 0.0, 1.0, 0.7, 0.01)
        w_min = st.slider("w_min", 0.0, 1.0, 0.0, 0.01)
        w_max = st.slider("w_max", 0.0, 1.0, 1.0, 0.01)

    w = w0
    ws = [w]
    for _ in range(int(steps)):
        w = float(np.clip(w + eta * pre * post, w_min, w_max))
        ws.append(w)

    fig = go.Figure()
    fig.add_trace(go.Scatter(y=ws, mode="lines", name="w"))
    fig.update_layout(
        height=420,
        template="plotly_dark",
        margin=dict(l=30, r=10, t=30, b=30),
        xaxis_title="step",
        yaxis_title="weight",
    )
    st.plotly_chart(fig, use_container_width=True)

    st.subheader("Reproducible API payload")
    st.code(
        json.dumps(
            dict(w=w0, pre=pre, post=post, eta=eta, w_min=w_min, w_max=w_max),
            indent=2,
        ),
        language="json",
    )

