/**
 * Empty stub for optional wallet connector packages that wagmi v3 / @wagmi/connectors
 * reference via guarded dynamic import() (accounts, porto, cbw-sdk, @base-org/account,
 * @metamask/connect-evm). We don't use those connectors, but the bundler resolves the
 * specifiers statically — aliasing them here keeps the build clean. Never imported at runtime.
 */
export default {};
