async function run() {
  try {
    const res = await fetch('http://localhost:5000/api/accounting/pnl/dashboard', {
      headers: {
        'Authorization': 'Bearer ' + process.argv[2]
      }
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
