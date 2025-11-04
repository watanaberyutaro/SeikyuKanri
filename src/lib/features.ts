// Feature flags管理

export const features = {
  arManagement: process.env.FEATURE_AR_MANAGEMENT === '1',
  emailSending: process.env.ENABLE_EMAIL_SENDING === '1',
} as const

export function isFeatureEnabled(feature: keyof typeof features): boolean {
  return features[feature] === true
}
