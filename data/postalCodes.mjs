// TODO: fetch postal codes, fallback to local file

// const location = new URL("https://ev-shv-prod-app-wa-consumerapi1.azurewebsites.net/api/getdsocollection")

// const json = await fetch(location).then(res => res.json())

// const codes = new Set()

// for (const dso of json) {
//   dso.PostalCodes.forEach(code => codes.add(code))
// }

// // export array
// const postalCodes = Array.from(codes)
// console.log(postalCodes, postalCodes.length) // 3366 ("Approximately 3100")

// writeFileSync("postalCodes.json", JSON.stringify(postalCodes))

import postalCodes from "./postalCodes.json" with { type: "json" }
console.log(`${postalCodes.length} postal codes`)

export default postalCodes
