const getCodeMetrics = require('./core')
const loaderUtils = require("loader-utils");
const validateOptions = require('schema-utils');

const schema = {
  type: 'object',
  properties: {
    errorLimit: {
      type: 'number'
    }
  }
}

class CodeError extends Error {
  /**
   * @param {string} messages - Formatted eslint errors.
   */
  constructor(messages) {
    super();
    this.name = "ESLintError";
    this.message = messages;
    this.stack = "";
  }
  inspect() {
    return this.message;
  }
}

const defaultOptions = {
  errorLimit: 30
}

module.exports = function(source, map){
  if(process.env.NODE_ENV === 'production'){
    return this.callback(null, source, map);
  }
  const options = Object.assign({}, defaultOptions, loaderUtils.getOptions(this));
  validateOptions(schema, options, 'code metrics Loader');
  let filename = this.resourcePath;
  let result = getCodeMetrics(filename, source, options)

  if(result.code !== 0){
    let msg = result.data.map(item=> item.message).join('\n')
    let err =  new Error(msg)
    this.callback(err, source, map)
    return;
  }
  this.callback(null, source, map);
  return;
}