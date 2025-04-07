# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

# Twitter Raid Security Improvements

This document outlines the security improvements implemented for the Twitter raid system to prevent exploitation and abuse.

## Security Features

### 1. Rate Limiting

We've implemented a robust rate limiting mechanism that restricts:
- **User-based limits**: Maximum 5 completions per user per hour
- **IP-based limits**: Maximum 3 completions per IP address per 10 minutes

These limits help prevent rapid-fire submission of raid completions and discourage the creation of multiple accounts to game the system.

### 2. IP Address Tracking

Each completion now stores the user's IP address, enabling:
- Detection of multiple accounts from the same IP address
- Identification of suspicious patterns
- Enhanced audit trail for investigating potential abuse

### 3. Enhanced Tweet Ownership Verification

We now verify that the tweet URL belongs to the provided Twitter username:
- Extracts username from tweet URL and compares with provided username
- Validates correct tweet URL format
- Prevents users from claiming tweets that aren't theirs

### 4. Admin Security Dashboard

Admins can access a dedicated security dashboard that displays:
- Multiple accounts using the same IP address
- Suspicious rapid completions (within 5 seconds)
- Analytics on potential abuse patterns

## Implementation Details

### Rate Limiter

The rate limiter uses in-memory storage with periodic cleanup to prevent memory leaks. It tracks attempts by both user ID and IP address with appropriate time windows.

### Tweet Ownership Verification

The verification process:
1. Extracts username from the tweet URL
2. Normalizes both the extracted and provided usernames
3. Compares them for an exact match
4. Logs failed verification attempts for security monitoring

### Suspicious Activity Detection

The system looks for two main patterns:
1. Multiple different user accounts completing raids from the same IP address
2. Raid completions happening in rapid succession (within 5 seconds) by different users

## Security Best Practices

- All security-sensitive operations are logged
- Rate limits have appropriate error messages with retry times
- IP addresses are tracked but not exposed to users
- Admin-only endpoints are protected with proper authorization checks

## Future Enhancements

Possible future security improvements:
- Browser fingerprinting for additional identity verification
- Machine learning to detect unusual patterns
- Additional verification mechanisms for high-value raids
