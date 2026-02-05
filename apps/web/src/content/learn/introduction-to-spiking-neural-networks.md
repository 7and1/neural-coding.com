---
title: "Introduction to Spiking Neural Networks"
description: "Learn how spiking neural networks mimic real brain computation with discrete spikes instead of continuous values."
publishedAt: "2026-02-04"
tags: ["spiking-neural-networks", "computational-neuroscience", "neuromorphic", "deep-learning"]
author: "Neural-Coding Team"
draft: false
---

# Introduction to Spiking Neural Networks

Your brain runs on about 20 watts. That's less than a light bulb. Yet it outperforms the most powerful supercomputers at tasks like recognizing faces, understanding speech, and navigating complex environments. How? The answer lies in how neurons communicate: through spikes.

Traditional artificial neural networks (ANNs) pass continuous values between layers. Your brain doesn't work that way. Real neurons fire discrete electrical pulses called action potentials, or "spikes." This fundamental difference is what Spiking Neural Networks (SNNs) aim to capture.

## What Makes SNNs Different?

Think of the difference like this: ANNs are like a water pipe system where information flows continuously. SNNs are more like Morse code—information is encoded in the timing and pattern of discrete signals.

In a standard ANN, a neuron might output 0.73. In an SNN, a neuron either fires (1) or doesn't fire (0) at any given moment. The information isn't in the magnitude—it's in *when* and *how often* the neuron fires.

This has three major implications:

1. **Temporal dynamics matter**: The timing of spikes carries information, not just their presence
2. **Sparse computation**: Most neurons are silent most of the time, saving energy
3. **Event-driven processing**: Computation only happens when spikes arrive

## The Biological Foundation

Real neurons maintain a voltage difference across their membrane, typically around -70 millivolts at rest. When a neuron receives input from other neurons, this voltage changes. If it crosses a threshold (around -55 mV), the neuron "fires"—generating an action potential that propagates down its axon to other neurons.

After firing, the neuron enters a refractory period where it cannot fire again immediately. This creates natural timing constraints that SNNs model explicitly.

The key insight is that biological neural networks have been optimized by evolution for billions of years. They've found solutions to information processing that we're only beginning to understand. SNNs attempt to leverage these solutions.

## A Simple SNN in Python

Let's build a basic spiking neuron using Brian2, a popular simulator for spiking neural networks:

```python
from brian2 import *

# Define neuron parameters
tau = 10*ms      # Membrane time constant
v_rest = -70*mV  # Resting potential
v_thresh = -55*mV  # Spike threshold
v_reset = -75*mV   # Reset potential after spike

# Leaky Integrate-and-Fire neuron equations
eqs = '''
dv/dt = (v_rest - v) / tau : volt
'''

# Create a group of 100 neurons
neurons = NeuronGroup(100, eqs, threshold='v > v_thresh',
                      reset='v = v_reset', method='exact')
neurons.v = v_rest  # Initialize at resting potential

# Create random input (Poisson spike trains)
input_group = PoissonGroup(100, rates=15*Hz)
synapses = Synapses(input_group, neurons, on_pre='v += 3*mV')
synapses.connect(p=0.1)  # 10% connection probability

# Record spikes
spike_monitor = SpikeMonitor(neurons)

# Run simulation
run(1*second)

# Visualize results
plot(spike_monitor.t/ms, spike_monitor.i, '.k', markersize=1)
xlabel('Time (ms)')
ylabel('Neuron index')
title('Raster plot of SNN activity')
show()
```

This code creates 100 leaky integrate-and-fire neurons receiving random input. The output is a "raster plot" showing when each neuron fires—a standard visualization in computational neuroscience.

## How Information is Encoded

SNNs can encode information in multiple ways:

### Rate Coding
The simplest approach: more spikes per second = stronger signal. If a neuron fires 50 times per second instead of 10, it's signaling something more intense. This is robust but slow—you need to count spikes over time.

### Temporal Coding
Information is in the precise timing of spikes. A neuron firing 1ms after a stimulus means something different than firing 10ms after. This is fast but requires precise timing mechanisms.

### Population Coding
Groups of neurons work together. The pattern of which neurons fire (and when) encodes information. This is how your visual cortex represents what you're seeing right now.

### Spike Patterns
Specific sequences of spikes carry meaning. Like words in a language, certain patterns might represent specific features or concepts.

## Training SNNs: The Challenge

Here's the problem: traditional backpropagation doesn't work directly with spikes. Why? Because a spike is a discontinuous event. You can't take the derivative of "fire or don't fire."

Several solutions have emerged:

### Surrogate Gradients
Replace the non-differentiable spike function with a smooth approximation during training. The network learns as if spikes were continuous, but operates with real spikes during inference.

```python
import torch
import torch.nn as nn

class SurrogateSpike(torch.autograd.Function):
    @staticmethod
    def forward(ctx, input):
        ctx.save_for_backward(input)
        return (input > 0).float()  # Hard threshold

    @staticmethod
    def backward(ctx, grad_output):
        input, = ctx.saved_tensors
        # Smooth surrogate gradient
        grad = grad_output * torch.exp(-torch.abs(input))
        return grad
```

### Spike-Timing-Dependent Plasticity (STDP)
A biologically-inspired learning rule: if neuron A fires just before neuron B, strengthen their connection. If A fires after B, weaken it. This is unsupervised and local—no backpropagation needed.

### ANN-to-SNN Conversion
Train a regular ANN, then convert it to an SNN. The continuous activations become firing rates. Simple but loses some of the temporal advantages.

## Why SNNs Matter Now

Three converging trends make SNNs increasingly relevant:

### 1. Energy Efficiency
GPT-4 training reportedly used gigawatt-hours of electricity. Your brain uses 20 watts. As AI scales, energy becomes a critical constraint. SNNs on neuromorphic hardware can be 100-1000x more energy efficient for certain tasks.

### 2. Neuromorphic Hardware
Chips like Intel's Loihi 2 and IBM's NorthPole are designed specifically for SNNs. They process spikes in parallel, in-memory, with minimal data movement. This is fundamentally different from GPU architecture.

### 3. Edge AI
Running AI on phones, sensors, and IoT devices requires extreme efficiency. SNNs excel here because they only compute when something happens—perfect for always-on, low-power applications.

## Current Limitations

Let's be honest about where SNNs struggle:

- **Training complexity**: Still harder to train than ANNs for most tasks
- **Software ecosystem**: Less mature tools compared to PyTorch/TensorFlow
- **Benchmark performance**: On standard ML benchmarks, ANNs usually win
- **Theoretical understanding**: We don't fully understand why biological networks work so well

## Practical Applications Today

Despite limitations, SNNs are already useful for:

- **Event cameras**: Sensors that output spikes naturally pair with SNNs
- **Keyword spotting**: Always-on voice detection with minimal power
- **Gesture recognition**: Processing temporal patterns efficiently
- **Robotics**: Real-time sensorimotor control
- **Anomaly detection**: Sparse, event-driven monitoring

## Getting Started

If you want to experiment with SNNs, here are your options:

**Simulators:**
- Brian2: Python-based, great for learning
- NEST: Scales to large networks
- Norse: PyTorch-based, GPU-accelerated

**Hardware:**
- Intel Loihi (research access)
- SpiNNaker (academic access)
- BrainChip Akida (commercial)

**Learning resources:**
- Gerstner's "Neuronal Dynamics" textbook (free online)
- Zenke's surrogate gradient tutorials
- This site's interactive simulators

## The Future

SNNs represent a bet on biology. Evolution has had billions of years to optimize neural computation. We've had decades. The gap in energy efficiency suggests we're missing something fundamental.

The question isn't whether SNNs will replace ANNs—they probably won't for most applications. The question is: what can we learn from biological neural networks that will make all AI better?

The brain's secret isn't just spikes. It's the combination of spikes, local learning rules, sparse connectivity, and hierarchical organization. SNNs are our best tool for understanding and replicating these principles.

## Further Reading

- [Maass, W. (1997). Networks of spiking neurons: The third generation of neural network models](https://doi.org/10.1016/S0893-6080(97)00011-7)
- [Tavanaei et al. (2019). Deep Learning in Spiking Neural Networks](https://arxiv.org/abs/1804.08150)
- [Neftci et al. (2019). Surrogate Gradient Learning in Spiking Neural Networks](https://arxiv.org/abs/1901.09948)
- [Roy et al. (2019). Towards spike-based machine intelligence](https://doi.org/10.1038/s41586-019-1677-2)
