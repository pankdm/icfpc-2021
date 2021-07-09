import fs from 'fs'
import express from 'express'
import { createServer as createViteServer } from 'vite'
import { naturalSort } from './src/utils/utils.js'

const PORT = process.env.PORT || 3000

async function createServer() {
  const app = express()
  const vite = await createViteServer({
    server: {
      middlewareMode: 'html',
    },
  })

  // UI API endpoints
  app.get('/api', (req, res) => {
    res.status(200)
    res.send('ok')
  })

  app.get('/api/problems', (req, res) => {
    const problems = fs.readdirSync('../problems')
    res.send(problems.sort(naturalSort))
  })

  app.get('/api/problems/:id', (req, res) => {
    const { id } = req.params
    const problem = JSON.parse(fs.readFileSync(`../problems/${id}`))
    res.send(problem)
  })

  // UI frontend server Vite.js
  app.use(vite.middlewares)

  // attach to porn. bring up the shields!
  app.listen(PORT, () => {
    console.log(`App listening at http://localhost:${PORT}`)
  })
}


createServer()
