import test from 'ava';
import fs from 'fs';
import path from 'path';
import getCodeMetrics from '../../src/core'



test('emptyFile', t=>{
  let filename = path.resolve(__dirname, 'emptyFile.js')
  let content = fs.readFileSync(filename).toString()
  let result = getCodeMetrics(filename, content, {
    errorLimit: 5
  })
  t.is(result.code, 0)
  t.is(result.data.length, 0)
})

test('metricsOver', t=>{
  let filename = path.resolve(__dirname, 'metricsOver.js')
  let content = fs.readFileSync(filename).toString()
  let result = getCodeMetrics(filename, content, {
    errorLimit: 5
  })
  
  t.is(result.code, 400)
  t.is(result.data.length, 1)
  t.is(result.data[0].complexity, 10)
})

test('classNested', t=>{
  let filename = path.resolve(__dirname, 'classNested.js')
  let content = fs.readFileSync(filename).toString()
  let result = getCodeMetrics(filename, content, {
    errorLimit: 5
  })

  t.is(result.code, 400)
  t.is(result.data.length, 2)
  t.is(result.data[0].complexity, 10)
})

test('functionNested', t=>{
  let filename = path.resolve(__dirname, 'functionNested.js')
  let content = fs.readFileSync(filename).toString()
  let result = getCodeMetrics(filename, content, {
    errorLimit: 5
  })

  t.is(result.code, 400)
  t.is(result.data.length, 2)
  t.is(result.data[0].complexity, 10)
  t.is(result.data[1].complexity, 7)
})