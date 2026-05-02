export function getRedirectGitHubClientId(): string {
  return process.env.GITHUB_CLIENT_ID?.trim() ?? ""
}

export function getDeviceGitHubClientId(): string {
  return process.env.GITHUB_CLIENT_ID?.trim() ?? ""
}

export function hasGitHubClientId(): boolean {
  return !!process.env.GITHUB_CLIENT_ID?.trim()
}
