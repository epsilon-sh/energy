import { writeFileSync } from 'fs'

const location = new URL("https://ev-shv-prod-app-wa-consumerapi1.azurewebsites.net/api/getdsocollection")
const output = import.meta.filename.replace(new RegExp(/\.mjs$/), ".json")

const response = await fetch(location)
const data = await response.json()

console.log(data.length, 'DSOs')
writeFileSync(output, JSON.stringify(data, null, 2))

export default data
