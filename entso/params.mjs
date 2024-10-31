export const documentTypes = {
  A44: 'DAY_AHEAD_PRICES',
}

export const domains = {
  '10YFI-1--------U': 'FI',
}

export const resolution = {
  PT15M: 15 * 60 * 1000, // 15 minutes in ms
  PT60M: 60 * 60 * 1000, // 1 hour in ms
}

export const getDocumentTypeKey = value => {
  const [documentType] = Object.entries(documentTypes).find(([_key, v]) => value === v)

  return documentType
}
export const getDomainKey = human => {
  return Object.entries(domains).find(([_key, value]) => value === human)[0]
}

export const getDomainHuman = key => {
  return domains[key] || key
}

export default {
  documentTypes,
  domains,
  getDocumentTypeKey,
  getDomainKey,
}
