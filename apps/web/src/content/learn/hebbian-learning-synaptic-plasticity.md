---
title: "Hebbian Learning and Synaptic Plasticity"
description: "Discover how neurons that fire together wire together - the foundational principle behind learning and memory in biological and artificial systems."
publishedAt: "2026-02-04"
tags: ["hebbian-learning", "synaptic-plasticity", "stdp", "learning-rules", "computational-neuroscience"]
author: "Neural-Coding Team"
draft: false
---

# Hebbian Learning and Synaptic Plasticity

"Neurons that fire together, wire together." You've probably heard this phrase. It's the most famous summary of how brains learn, proposed by Donald Hebb in 1949. But what does it actually mean? And how do we implement it in code?

Hebb's insight was revolutionary: learning doesn't require a teacher. The brain can organize itself based purely on the patterns of activity it experiences. This idea predates backpropagation by decades and remains central to understanding biological intelligence.

## The Original Hebb Rule

Here's what Hebb actually wrote:

> "When an axon of cell A is near enough to excite cell B and repeatedly or persistently takes part in firing it, some growth process or metabolic change takes place in one or both cells such that A's efficiency, as one of the cells firing B, is increased."

Translation: if neuron A consistently helps neuron B fire, the connection from A to B gets stronger.

Mathematically, the simplest form is:

$$\Delta w_{ij} = \eta \cdot x_i \cdot x_j$$

Where:
- $\Delta w_{ij}$ is the change in synaptic weight from neuron $i$ to neuron $j$
- $\eta$ is the learning rate
- $x_i$ is the activity of the presynaptic neuron
- $x_j$ is the activity of the postsynaptic neuron

When both neurons are active, the weight increases. Simple.

## The Problem with Pure Hebbian Learning

There's a catch: weights only go up. If neurons that fire together strengthen their connections, and stronger connections make neurons more likely to fire together, you get runaway excitation. Every weight eventually saturates at its maximum value.

This is why pure Hebbian learning doesn't work in practice. We need additional mechanisms.

## Stabilizing Hebbian Learning

Several modifications fix the instability:

### Weight Decay
Add a term that slowly decreases all weights:

$$\Delta w_{ij} = \eta \cdot x_i \cdot x_j - \lambda \cdot w_{ij}$$

### Weight Normalization
After each update, normalize weights so they sum to a constant:

$$w_{ij} \leftarrow \frac{w_{ij}}{\sum_k w_{kj}}$$

### BCM Rule
The Bienenstock-Cooper-Munro rule introduces a sliding threshold. Connections strengthen when postsynaptic activity exceeds the threshold, weaken when below:

$$\Delta w_{ij} = \eta \cdot x_i \cdot x_j \cdot (x_j - \theta)$$

The threshold $\theta$ itself adapts based on recent activity, creating automatic homeostasis.

### Oja's Rule
A mathematically elegant solution that automatically bounds weights:

$$\Delta w_{ij} = \eta \cdot x_j \cdot (x_i - w_{ij} \cdot x_j)$$

This performs online PCA—the weights converge to the principal component of the input.

## Implementation: Basic Hebbian Learning

Let's implement several variants:

```python
import numpy as np
import matplotlib.pyplot as plt

class HebbianNetwork:
    def __init__(self, n_input, n_output, rule='basic'):
        """
        Simple Hebbian learning network.

        Parameters:
        - n_input: number of input neurons
        - n_output: number of output neurons
        - rule: 'basic', 'oja', or 'bcm'
        """
        self.weights = np.random.randn(n_input, n_output) * 0.1
        self.rule = rule
        self.theta = np.ones(n_output)  # BCM threshold

    def forward(self, x):
        """Compute output given input."""
        return np.dot(x, self.weights)

    def learn(self, x, y, lr=0.01):
        """
        Update weights based on Hebbian rule.

        Parameters:
        - x: input activity (n_input,)
        - y: output activity (n_output,)
        - lr: learning rate
        """
        if self.rule == 'basic':
            # Basic Hebbian with decay
            self.weights += lr * np.outer(x, y)
            self.weights *= 0.99  # Weight decay

        elif self.rule == 'oja':
            # Oja's rule - stable, performs PCA
            for j in range(len(y)):
                self.weights[:, j] += lr * y[j] * (x - self.weights[:, j] * y[j])

        elif self.rule == 'bcm':
            # BCM rule with sliding threshold
            for j in range(len(y)):
                self.weights[:, j] += lr * x * y[j] * (y[j] - self.theta[j])
            # Update threshold (sliding average of y^2)
            self.theta = 0.99 * self.theta + 0.01 * y**2

    def normalize_weights(self):
        """Normalize weight vectors to unit length."""
        norms = np.linalg.norm(self.weights, axis=0, keepdims=True)
        self.weights /= (norms + 1e-8)


# Demo: Learning oriented bars
def generate_oriented_bar(angle, size=10):
    """Generate a simple oriented bar stimulus."""
    img = np.zeros((size, size))
    center = size // 2
    length = size // 2 - 1

    for i in range(-length, length + 1):
        x = int(center + i * np.cos(angle))
        y = int(center + i * np.sin(angle))
        if 0 <= x < size and 0 <= y < size:
            img[y, x] = 1.0

    return img.flatten()


# Create network
n_pixels = 100  # 10x10 image
n_outputs = 4   # Learn 4 features
net = HebbianNetwork(n_pixels, n_outputs, rule='oja')

# Training: present random oriented bars
n_iterations = 5000
angles = np.linspace(0, np.pi, 8)  # 8 different orientations

for i in range(n_iterations):
    # Random orientation
    angle = np.random.choice(angles)
    x = generate_oriented_bar(angle)

    # Add noise
    x += np.random.randn(n_pixels) * 0.1
    x = np.clip(x, 0, 1)

    # Forward pass and learn
    y = net.forward(x)
    y = np.maximum(y, 0)  # ReLU activation
    net.learn(x, y, lr=0.001)

# Visualize learned features
fig, axes = plt.subplots(1, n_outputs, figsize=(12, 3))
for i in range(n_outputs):
    feature = net.weights[:, i].reshape(10, 10)
    axes[i].imshow(feature, cmap='RdBu_r')
    axes[i].set_title(f'Feature {i+1}')
    axes[i].axis('off')
plt.suptitle('Learned Orientation Detectors (Oja\'s Rule)')
plt.tight_layout()
plt.show()
```

This network learns to detect oriented bars—similar to what neurons in primary visual cortex do. No labels, no backpropagation, just correlation-based learning.

## Spike-Timing-Dependent Plasticity (STDP)

The modern refinement of Hebbian learning is STDP. It adds a crucial ingredient: precise timing.

The rule is simple:
- If the presynaptic neuron fires *before* the postsynaptic neuron: strengthen the connection (the pre neuron helped cause the post to fire)
- If the presynaptic neuron fires *after* the postsynaptic neuron: weaken the connection (the pre neuron wasn't useful)

The magnitude depends on the time difference:

$$\Delta w = \begin{cases} A_+ \exp(-\Delta t / \tau_+) & \text{if } \Delta t > 0 \\ -A_- \exp(\Delta t / \tau_-) & \text{if } \Delta t < 0 \end{cases}$$

Where $\Delta t = t_{post} - t_{pre}$.

```python
from brian2 import *

# STDP parameters
tau_pre = tau_post = 20*ms
A_pre = 0.01
A_post = -A_pre * 1.05  # Slight asymmetry for stability

# Neuron model
eqs_neurons = '''
dv/dt = (v_rest - v) / tau_m : volt
tau_m : second
v_rest : volt
'''

# STDP synapse model
eqs_synapses = '''
w : 1
dapre/dt = -apre / tau_pre : 1 (event-driven)
dapost/dt = -apost / tau_post : 1 (event-driven)
'''

on_pre = '''
v_post += w * mV
apre += A_pre
w = clip(w + apost, 0, 1)
'''

on_post = '''
apost += A_post
w = clip(w + apre, 0, 1)
'''

# Create neurons
N = 1000
neurons = NeuronGroup(N, eqs_neurons, threshold='v > -55*mV',
                      reset='v = -75*mV', method='exact')
neurons.v = -70*mV
neurons.tau_m = 20*ms
neurons.v_rest = -70*mV

# Input layer (Poisson)
input_neurons = PoissonGroup(100, rates=10*Hz)

# STDP synapses
synapses = Synapses(input_neurons, neurons, eqs_synapses,
                    on_pre=on_pre, on_post=on_post)
synapses.connect(p=0.1)
synapses.w = 0.5  # Initial weights

# Monitor weights
weight_mon = StateMonitor(synapses, 'w', record=range(100))

# Run
run(60*second, report='text')

# Plot weight evolution
plt.figure(figsize=(10, 4))
plt.plot(weight_mon.t/second, weight_mon.w.T, alpha=0.3)
plt.xlabel('Time (s)')
plt.ylabel('Synaptic weight')
plt.title('STDP Weight Evolution')
plt.show()
```

## Biological Evidence

STDP isn't just a theoretical construct—it's been observed experimentally in many brain regions:

- **Hippocampus**: Where memories are formed
- **Visual cortex**: Where visual features are learned
- **Cerebellum**: Where motor skills are refined

The time windows vary by brain region (typically 10-50 ms), but the basic principle holds: causality matters.

## What Hebbian Learning Can Do

### Unsupervised Feature Learning
Networks with Hebbian learning automatically discover statistical structure in their inputs. They learn features that are common, correlated, or predictive—without any labels.

### Associative Memory
Hopfield networks use Hebbian learning to store patterns. Present a partial pattern, and the network completes it. This is a model of content-addressable memory.

```python
class HopfieldNetwork:
    def __init__(self, n_neurons):
        self.n = n_neurons
        self.weights = np.zeros((n_neurons, n_neurons))

    def store(self, patterns):
        """Store patterns using Hebbian learning."""
        for p in patterns:
            p = np.array(p).flatten()
            # Hebbian outer product
            self.weights += np.outer(p, p)
        # Zero diagonal (no self-connections)
        np.fill_diagonal(self.weights, 0)
        # Normalize
        self.weights /= len(patterns)

    def recall(self, pattern, steps=10):
        """Recall pattern from partial input."""
        state = np.array(pattern).flatten().copy()
        for _ in range(steps):
            for i in range(self.n):
                h = np.dot(self.weights[i], state)
                state[i] = 1 if h >= 0 else -1
        return state
```

### Competitive Learning
With lateral inhibition, Hebbian learning creates winner-take-all dynamics. Neurons specialize for different input patterns, forming a self-organized map.

## Limitations and Modern Perspectives

Hebbian learning alone can't do everything:

- **No credit assignment**: It can't solve problems requiring long chains of reasoning
- **Local only**: Each synapse only sees its pre and post neurons
- **Slow**: Requires many presentations to learn

Modern deep learning uses backpropagation, which solves credit assignment but is biologically implausible. The brain probably uses something in between—perhaps predictive coding, equilibrium propagation, or other mechanisms we're still discovering.

## The Bigger Picture

Hebbian learning teaches us something profound: intelligence can emerge from simple local rules. No central controller, no global error signal—just neurons adjusting their connections based on local correlations.

This is how your brain learned to see, hear, and move. It's how you formed memories and developed skills. Understanding Hebbian learning is understanding the foundation of biological intelligence.

The challenge now is combining Hebbian principles with the power of modern deep learning. Can we get the best of both worlds—the efficiency and biological plausibility of local learning with the problem-solving power of gradient descent?

That's one of the most exciting open questions in AI.

## Further Reading

- [Hebb, D.O. (1949). The Organization of Behavior](https://pure.mpg.de/rest/items/item_2346268/component/file_2346267/content)
- [Bi & Poo (1998). Synaptic Modifications in Cultured Hippocampal Neurons](https://doi.org/10.1523/JNEUROSCI.18-24-10464.1998)
- [Markram et al. (2012). A History of Spike-Timing-Dependent Plasticity](https://doi.org/10.3389/fnsyn.2011.00004)
- [Oja, E. (1982). A Simplified Neuron Model as a Principal Component Analyzer](https://doi.org/10.1007/BF00275687)
- [Bienenstock, Cooper & Munro (1982). Theory for the Development of Neuron Selectivity](https://doi.org/10.1523/JNEUROSCI.02-01-00032.1982)
