const pool = require('../db')

exports.mechanics_post = (req, res, next) => {
  const queryText = `
  INSERT INTO mechanics 
  (
   mech_name,
   mech_description,
   mech_yt_url_controller,
   mech_yt_url_kbm,
   mech_difficulty,
   mech_importance
  )
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING *
  `;

  const body = req.body;
  const values = [
    body.mech_name, 
    body.mech_description, 
    body.mech_yt_url_controller,
    body.mech_yt_url_kbm, 
    body.mech_difficulty, 
    body.mech_importance
  ]; 

  pool.query(queryText, values, (err, result) => {

    if(err) return res.json(err)

    return res.json(result.rows[0])
      
  })
}