const {
  MetricsParser,
  MetricsConfiguration
} = require('tsmetrics-core');
const path = require('path')

function getType(item) {
  const maps = {
    'Class declaration': 'class',
    'Function declaration': 'function',
    'Function expression': 'function',
    'Method declaration': 'function',
    'Arrow function': 'function'
  }
  return maps[item.description]
}


function log(limit) {
  let messages = []
  return {
    error: function (complexity, filename, functionName, line, column) {
      let message = (`at ${filename}:${line}:${column}, function "${functionName}", 
      Code complexity ${complexity} is over ${limit}, you must consider refactoring code.
      `)
      messages.push({
        code: 401,
        complexity,
        functionName,
        message
      })
    },
    messages: messages
  }
}


function getCodeMetrics(filename, source, options={}) {
  options.errorLimit = options.errorLimit || 30;
  let logs = log(options.errorLimit);

  let metricsForFile = MetricsParser.getMetricsFromText(filename,
    source,
    MetricsConfiguration)

  parse(metricsForFile.metrics.children)

  if(logs.messages.length > 0){
    return {
      code: 400,
      data: logs.messages
    }
  }else{
    return {
      code: 0,
      data: []
    }
  }

  function parse(children, needTotal = false) {
    let complexity = 1;

    children.forEach((item, index) => {
      if (getType(item) === 'class' || getType(item) === 'function') {
        if (item.children.length > 0) {
          let _complexity = parse(item.children, true)
          if (_complexity > options.errorLimit) {
            let child = children[index - 1];
            logs.error(_complexity, filename, child.text, child.line, child.column)
          }
        }
      } else if (needTotal) {
        complexity += item.complexity;
      }
    })
    return complexity;
  }
}
module.exports = getCodeMetrics;