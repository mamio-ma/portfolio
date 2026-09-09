---
layout: post
title: Math and code rendering demo
date: 2026-09-05 12:00:00
description: Verifying math typesetting, code highlighting, and the table of contents.
tags: demo math code
categories: general
toc:
  sidebar: left
---

## Inline and display math

Inline: the loss is $\mathcal{L}(\theta) = \frac{1}{n}\sum_i \ell(f_\theta(x_i), y_i)$.

Display:

$$
\nabla_\theta \mathcal{L} = \frac{1}{n} \sum_{i=1}^{n} \nabla_\theta \ell\big(f_\theta(x_i), y_i\big)
$$

## Code

{% highlight python %}
def sgd_step(theta, grad, lr=1e-3):
    return theta - lr * grad
{% endhighlight %}

## Notes

The `toc` front matter renders a left sidebar table of contents.
