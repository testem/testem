module.exports.init = function(pluginConfig, app){
  app.get('/plugin', function(req, res){
    res.send('plugin successfully configured')
  })
}
