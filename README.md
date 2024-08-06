# Cloth Simulation (Using Verlet Integration) 

This project was an experiment inspired by reading Sarah Drasner's "Animating
SVGs". I wanted to see how efficiently modern browsers and frameworks could
generate SVGs, ideally at a solid 60 frames per second, to model an underlying
physics simulation.

It models a cloth under the effects of gravity. Clicking and dragging the mouse
will tear the cloth.

The simple simulation uses Verlet integration to simulate Newton's kinematic
equations, a more numerically stable approach than (for example) Euler
integration.

## Live Demo

Play with the simulation at https://verlet-cloth.vercel.app . Note that there is
no way to reset the simulation other than refreshing the page.

## Installation

```bash
pnpm install 
pnpm run dev
```
