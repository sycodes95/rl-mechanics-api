const pool = require('../db');

exports.mechanics_status_post = (req, res, next) => {
  const queryText = `
  INSERT INTO mechanics_status 
  (
   user_id,
   mech_id,
   mechanic_status_value,
  )
  VALUES ($1, $2, $3)
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