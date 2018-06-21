export default (dateStr) => {
  const d = new Date(dateStr)
  // d.setHours(d.getHours())
  let minutes = d.getMinutes()
  if (minutes < 10) {
    minutes = '0' + minutes
  }
  return d.toDateString().split('2018')[0].trim() + ', ' + d.getHours() + ':' + minutes
}
