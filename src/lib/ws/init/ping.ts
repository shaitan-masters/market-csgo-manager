module.exports = connection => {
    setInterval(connection.ping, 60000)
}
