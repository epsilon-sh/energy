const processed = fetch("https://dataportal-api.nordpoolgroup.com/api/DayAheadPrices?date=2025-05-12&market=DayAhead&deliveryArea=FI&currency=EUR")
  .then(res => res.json())
  .then(json => json.multiAreaEntries)
  .then(entries => entries.map(({
    deliveryStart: start,
    deliveryEnd: end,
    entryPerArea: {
      FI: EurPerMWh
    }
  }) => ({ start, end, EurPerMWh })))


console.log(await processed)
