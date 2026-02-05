from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel, Field


app = FastAPI(title="neural-coding compute", version="0.1.0")


class LIFRequest(BaseModel):
    dt: float = Field(default=0.001, gt=0.0, le=0.01, description="Seconds")
    t_max: float = Field(default=1.0, gt=0.0, le=10.0, description="Seconds")
    R: float = Field(default=1e7, gt=0.0, le=1e9, description="Ohms")
    C: float = Field(default=1e-9, gt=0.0, le=1.0, description="Farads")
    V_rest: float = Field(default=-0.07, description="Volts")
    V_reset: float = Field(default=-0.07, description="Volts")
    V_th: float = Field(default=-0.05, description="Volts")
    I: float = Field(default=1e-9, description="Amps (constant current)")
    seed: Optional[int] = Field(default=None)


class LIFResponse(BaseModel):
    t: List[float]
    v: List[float]
    spikes_t: List[float]


@app.post("/lif/simulate", response_model=LIFResponse)
def lif_simulate(req: LIFRequest) -> LIFResponse:
    """
    Classic LIF with constant input current:
      C dV/dt = -(V - V_rest)/R + I
    with reset when V >= V_th.
    """
    if req.seed is not None:
        np.random.seed(req.seed)

    n = int(np.floor(req.t_max / req.dt)) + 1
    t = np.linspace(0.0, req.t_max, n, dtype=np.float64)
    v = np.empty_like(t)
    spikes: list[float] = []

    V = req.V_rest
    v[0] = V

    for i in range(1, n):
        dV = (-(V - req.V_rest) / (req.R * req.C) + (req.I / req.C)) * req.dt
        V = V + dV
        if V >= req.V_th:
            spikes.append(float(t[i]))
            V = req.V_reset
        v[i] = V

    return LIFResponse(t=t.tolist(), v=v.tolist(), spikes_t=spikes)


class HebbRequest(BaseModel):
    w: float = Field(default=0.1)
    pre: float = Field(default=0.0, ge=0.0, le=1.0)
    post: float = Field(default=0.0, ge=0.0, le=1.0)
    eta: float = Field(default=0.01, gt=0.0, le=1.0)
    w_min: float = Field(default=0.0)
    w_max: float = Field(default=1.0)


class HebbResponse(BaseModel):
    w_next: float


@app.post("/hebb/step", response_model=HebbResponse)
def hebb_step(req: HebbRequest) -> HebbResponse:
    """
    Simple Hebbian update:
      w <- clip(w + eta * pre * post, [w_min, w_max])
    """
    w_next = req.w + req.eta * req.pre * req.post
    w_next = float(np.clip(w_next, req.w_min, req.w_max))
    return HebbResponse(w_next=w_next)

