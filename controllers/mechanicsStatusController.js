const pool = require('../db');

exports.mechanics_status_put = (req, res) => {
  const queryText = `
  INSERT INTO mechanics_status 
  ( 
   user_id,
   mech_id,
   mechanic_status_value
  )
  VALUES ($1, $2, $3)
  ON CONFLICT (user_id, mech_id)
  DO UPDATE SET mechanic_status_value = EXCLUDED.mechanic_status_value
  RETURNING *
  `;

  const body = req.body;
  const values = [
    body.user_id, 
    body.mech_id, 
    body.mechanic_status_value
  ]; 
  pool.query(queryText, values, (err, result) => {
 
    if(err) return res.json(err)

    return res.json({mechanic: result.rows[0]})
      
  })
}

exports.mechanics_status_get = (req, res) => {
  console.log(req.query);
  const queryText = 'SELECT * FROM mechanics_status WHERE user_id = $1'
  const queryValues = [req.query.user_id]
  pool.query(queryText, queryValues, (err, result) => {
    if(err) return res.json(err)
    return res.json({ mechanics_statuses : result.rows})
    
  })
}