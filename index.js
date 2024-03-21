const express = require('express')
const axios = require('axios')
const redis = require('redis')

const PORT = process.env.PORT || 4000
const REDIS_PORT = process.env.REDIS_PORT || 6379

const client = redis.createClient({
  legacyMode: true,
  PORT: REDIS_PORT
})

client.connect().catch(console.error)

const app = express()

const setResponse = (name, image) => {
  return `<h1>${name} - ${image}</h1>`
}

const getRepos = async (req, res, next)=> {
  try {
    console.log('Fetching data...')  
    const { character } = req.params
    const { data } = await axios.get(`https://rickandmortyapi.com/api/character/?name=${character}`)
    const { image } = data.results[0]
  
    //SEND RESPONSE TO REDIS TO CACHE - 1HR
    await client.setEx(character, 3600, image)
    res.send(setResponse(character, image))
    
  } catch (error) {
    console.log(error)
    res.status(500)
  }
}

//REDIS CACHE MIDDLEWARE
const cacheData = (req, res, next)=> {
  const { character } = req.params

  client.get(character, (err, data)=> {
    if (err) throw err

    if (data !== null) {
      console.log('Cached data...') 
      res.send(setResponse(character, data))
    } else {
      next()
    }
  })
}

app.get('/characters/:character', cacheData, getRepos)

app.listen(PORT, ()=> console.log(`App listening on port ${PORT}`))

