# Embedding Guide

This interactive component can be embedded in blog posts, documentation, or any web page.

## Quick Embed

Add this iframe to your HTML:

```html
<iframe
  src="https://your-deployed-url.com"
  width="100%"
  height="550"
  frameborder="0"
  sandbox="allow-scripts allow-same-origin"
  loading="lazy"
  title="Interoperable Address Demo"
></iframe>
```

## Responsive Embed

For responsive sizing, wrap the iframe in a container:

```html
<div style="max-width: 720px; margin: 0 auto;">
  <iframe
    src="https://your-deployed-url.com"
    width="100%"
    height="550"
    frameborder="0"
    sandbox="allow-scripts allow-same-origin"
    loading="lazy"
    title="Interoperable Address Demo"
  ></iframe>
</div>
```

## Mobile-Friendly

The component is fully responsive and works on:
- Desktop (720px container)
- Tablet (adjusts to container width)
- Mobile (minimum 320px, stacks inputs on small screens)

## Features

- **Random color themes**: Each page load randomizes between 4 color schemes
- **Smooth animations**: Scale and fade transitions using Framer Motion
- **Real ENS resolution**: Resolves actual ENS names via ensdata.net
- **Hex address support**: Paste any Ethereum address directly
- **Chain selection**: Switch between Ethereum, Base, Arbitrum, Optimism, and Polygon

## Building for Production

```bash
npm run build
```

The `dist/` folder contains the production-ready files.

## Deployment

Deploy the `dist/` folder to:
- Vercel
- Netlify
- GitHub Pages
- Any static hosting

Then update the iframe `src` with your deployed URL.

## Sandbox Attributes

The `sandbox` attribute limits iframe permissions for security:
- `allow-scripts`: Enables JavaScript for interactivity
- `allow-same-origin`: Allows API calls to ensdata.net

## Example Integration

See `embed-example.html` for a complete blog post example.
