import fs from 'fs'
import express from 'express'
import { createServer as createViteServer } from 'vite'
import { naturalSort } from './src/utils/utils.js'
import _ from 'lodash'
import shell from 'shelljs'

const PORT = process.env.PORT || 3000

function walk(folderPath) {
  function _walk(folderPath, prefix='', depth=0) {
    const folder = prefix + folderPath
    let contents = fs.readdirSync(folder)
    contents = _.map(contents, item => {
      const itemPath = `${folder}/${item}`
      const stat = fs.statSync(itemPath)
      if (stat.isDirectory()) {
        return _walk(item, `${folder}/`, depth+1)
      } else {
        return itemPath
      }
    })
    return _.flattenDeep(contents)
  }
  const allFiles = _walk(folderPath)
  return allFiles.map(f => f.replace(`${folderPath}/`, ''))
}

const getSolutions = (folder) => {
  const allSolutions = walk(folder)
  const allSolutionsDict = _.groupBy(allSolutions, solutionPath => parseInt(_.last(solutionPath.split('/'))))
  return allSolutionsDict
}

async function createServer() {
  const app = express()
  app.use(express.json())
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

  app.get('/api/problems/all', (req, res) => {
    const problems = fs.readdirSync('../problems')
    const all_problems = {}
    _.map(problems, (id) => {
      const problem = JSON.parse(fs.readFileSync(`../problems/${id}`))
      all_problems[id] = problem
    });
    res.send(all_problems)
  })

  app.get('/api/problems/:id', (req, res) => {
    const { id } = req.params
    const problem = JSON.parse(fs.readFileSync(`../problems/${id}`))
    res.send(problem)
  })

  app.get('/api/solutions/:problemId', (req, res) => {
    const { problemId } = req.params
    const { solutionKey } = req.query
    if (solutionKey) {
      const solution = JSON.parse(fs.readFileSync(`../solutions/${solutionKey}`))
      res.send(solution)
    } else {
      const solutions = getSolutions('../solutions')
      res.send(solutions[problemId] || [])
    }
  })
  app.post('/api/solutions/:problemId', (req, res) => {
    const { problemId } = req.params
    const { forSubmit=false } = req.query
    const { alias='' } = req.query
    const solution = req.body
    console.log(req.query)
    fs.writeFileSync(`../solutions/manual/${problemId}_${alias}_${Date.now()}`, JSON.stringify(solution))
    fs.writeFileSync(`../solutions/current`, JSON.stringify(solution))
    if (forSubmit) {
      // don't use date to make it easier to push to git
      fs.writeFileSync(`../solutions/submit/${problemId}_${alias}`, JSON.stringify(solution))
    }
    res.status(201)
    res.send()
  })

  app.get('/api/stats', (req, res) => {
    // shell.exec('../get_stats_js.py ../')
    // const stats = JSON.parse(fs.readFileSync('../data/stats_js.json'))

    // switch to frozen stats
    const stats = JSON.parse(fs.readFileSync('../data/stats.json'))
    res.send(stats)
  })



  // UI frontend server Vite.js
  app.use(vite.middlewares)

  // attach to porn. bring up the shields!
  app.listen(PORT, () => {
    console.log(`App listening at http://localhost:${PORT}`)
  })
}


createServer()
