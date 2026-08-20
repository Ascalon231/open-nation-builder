# Contributing to OpenNation Builder

Thank you for your interest in contributing to **OpenNation Builder**! We welcome contributions from developers, designers, cartographers, and worldbuilders of all backgrounds.

## Code of Conduct

Please be respectful, collaborative, and constructive in all discussions and contributions.

## How Can You Contribute?

1. **Reporting Bugs & Issues**: Open an issue describing the bug, steps to reproduce, and screenshots if applicable.
2. **Feature Suggestions**: Have an idea for new procedural generation algorithms, visual themes, or geopolitics simulation? Submit a feature request issue!
3. **Pull Requests**:
   - Fork the repository.
   - Create a feature branch: `git checkout -b feature/amazing-theme`
   - Commit your changes with clear messages.
   - Ensure the project builds cleanly: `npm run build`
   - Open a Pull Request.

## Local Development Setup

```bash
# Clone your fork
git clone https://github.com/<your-username>/open-nation-builder.git
cd open-nation-builder

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Architectural Guidelines

- Keep engine modules in `src/engine/` decoupled from UI logic.
- The `CanvasRenderer` in `src/ui/` should handle pure rendering logic.
- Maintain seamless horizontal cylindrical wrapping across all coordinate calculations.

Thank you for helping make OpenNation Builder better for everyone!
