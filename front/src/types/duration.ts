export const durations = ["P1Y", "P3M", "P1M", "P7D", "P1D", "PT1H", "PT15M", "PT1M"] as const;
export type Duration = typeof durations[number];

export const periodResolutions: Record<Duration, Duration[]> = {
    "P1Y": ["P1M", "P7D", "P1D"],
    "P3M": ["P1M", "P7D", "P1D"],
    "P1M": ["P7D", "P1D", "PT1H"],
    "P7D": ["P1D", "PT1H", "PT15M"],
    "P1D": ["PT1H", "PT15M"],
    "PT1H": ["PT15M", "PT1M"],
    "PT15M": ["PT1M"],
    "PT1M": [],
};

export const humanReadableDurations: Record<Duration, string> = {
    "P1Y": "Year",
    "P3M": "Quarter",
    "P1M": "Month",
    "P7D": "Week",
    "P1D": "Day",
    "PT1H": "Hour",
    "PT15M": "15 Minutes",
    "PT1M": "Minute",
};

