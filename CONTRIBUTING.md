# Contributing to Zimbabwe Shipping Nexus

Thank you for considering contributing to Zimbabwe Shipping Nexus! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all contributors.

### Our Standards

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js 18.x or 20.x
- npm or yarn
- Git
- Basic knowledge of React, TypeScript, and Supabase

### Setting Up Development Environment

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/zimbabwe-shipping-nexus.git
   cd zimbabwe-shipping-nexus
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create a `.env` file:
   ```bash
   cp .env.example .env
   ```

5. Add your Supabase credentials to `.env`

6. Start development server:
   ```bash
   npm run dev
   ```

## Development Workflow

### Branch Naming Convention

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions or fixes

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code restructuring
- `perf`: Performance improvements
- `test`: Adding tests
- `chore`: Maintenance tasks

**Example:**
```
feat(authentication): add multi-factor authentication

Implemented MFA using Supabase Auth.
Users can now enable 2FA via QR code.

Closes #123
```

## Coding Standards

### TypeScript

- Use TypeScript for all new files
- Avoid using `any` type
- Define proper interfaces and types
- Use strict mode

### React

- Use functional components with hooks
- Implement proper error boundaries
- Use React.lazy() for code splitting
- Follow component composition patterns

### Code Style

- Follow ESLint configuration
- Use Prettier for formatting
- Maximum line length: 100 characters
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### File Organization

```
src/
├── components/      # Reusable components
├── pages/          # Route pages
├── hooks/          # Custom hooks
├── utils/          # Utility functions
├── types/          # TypeScript types
├── contexts/       # React contexts
└── integrations/   # Third-party integrations
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### Writing Tests

- Write tests for all new features
- Aim for >80% code coverage
- Test edge cases and error scenarios
- Use descriptive test names

**Example:**
```typescript
describe('ShippingCalculator', () => {
  it('should calculate correct price for 1 drum', () => {
    const result = calculatePrice('drum', 1);
    expect(result).toBe(260);
  });

  it('should apply bulk discount for 5+ drums', () => {
    const result = calculatePrice('drum', 5);
    expect(result).toBe(1200);
  });
});
```

## Pull Request Process

### Before Submitting

1. Ensure all tests pass
2. Update documentation if needed
3. Run linter and fix issues
4. Test your changes locally
5. Rebase on latest main branch

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] All tests pass
- [ ] New features have tests
- [ ] Documentation is updated
- [ ] Commit messages follow convention
- [ ] No console.log statements
- [ ] TypeScript types are properly defined
- [ ] Accessibility considerations addressed
- [ ] Performance impact considered

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issue
Closes #(issue number)

## Testing
Describe testing done

## Screenshots (if applicable)
Add screenshots

## Checklist
- [ ] Tests pass
- [ ] Linter passes
- [ ] Documentation updated
```

### Review Process

1. Submit PR with clear description
2. Wait for CI/CD checks to pass
3. Address reviewer feedback
4. Maintainer will merge once approved

## Development Best Practices

### Security

- Never commit sensitive data
- Use environment variables
- Validate all user inputs
- Follow OWASP guidelines
- Report security issues privately

### Performance

- Optimize bundle size
- Use code splitting
- Implement lazy loading
- Cache API responses
- Profile before optimizing

### Accessibility

- Use semantic HTML
- Include ARIA labels
- Test with screen readers
- Support keyboard navigation
- Ensure color contrast

## Getting Help

- Check existing issues and PRs
- Read documentation
- Ask in GitHub Discussions
- Contact maintainers

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.

## Recognition

Contributors will be recognized in the project README.

---

Thank you for contributing! 🎉
