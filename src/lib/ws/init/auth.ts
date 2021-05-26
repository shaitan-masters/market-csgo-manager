module.exports = connection => {
    setInterval(connection.auth, 60000)
}
