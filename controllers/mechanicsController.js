const { filter, filterLimit } = require('async');
const pool = require('../db');
const { search } = require('../routes');
const { query } = require('express');

exports.mechanics_post = (req, res, next) => {
  console.log(req.body)
  const queryText = `
  INSERT INTO mechanics 
  (
   mech_name,
   mech_description,
   mech_yt_url_controller,
   mech_yt_url_kbm,
   mech_difficulty,
   mech_importance,
   mech_url,
   mech_type
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  RETURNING *
  `;

  const body = req.body;
  const values = [
    body.mech_name, 
    body.mech_description, 
    body.mech_yt_url_controller,
    body.mech_yt_url_kbm, 
    body.mech_difficulty, 
    body.mech_importance,
    body.mech_url,
    body.mech_type
  ]; 
  console.log(queryText, values);
  pool.query(queryText, values, (err, result) => {

    if(err) return res.json(err)

    return res.json({mechanic: result.rows[0]})
      
  })
}

exports.mechanics_get = (req, res, next) => {

  let { searchValue, filterValues, selectedSortColumn, paginationData } = req.query
  console.log(searchValue);
  if(searchValue === 'null') searchValue = null
  console.log('ccccc');
  if(filterValues === 'null'){
    filterValues = null
  } else {
    filterValues = JSON.parse(filterValues)
  }
  
  selectedSortColumn = JSON.parse(selectedSortColumn)
  paginationData = JSON.parse(paginationData)
  
  let queryText = `SELECT * FROM mechanics`
  let queryParams = []
  if(searchValue || filterValues) {
    queryText += ` WHERE `;
    if(searchValue) {
      
      console.log(searchValue);
      queryText += `
      (mech_name::text ILIKE $${queryParams.length + 1}
      OR mech_description::text ILIKE $${queryParams.length + 1}
      OR mech_difficulty::text ILIKE $${queryParams.length + 1}
      OR mech_importance::text ILIKE $${queryParams.length + 1}
      )`;
      
      queryParams.push(`%${searchValue}%`)
    }

    if(filterValues) {
      for(let values in filterValues){
        if(queryParams.length > 0 && (filterValues[values].firstInput || filterValues[values].secondInput)) queryText += ` AND `
        if(filterValues[values].firstInput === '' || filterValues[values].firstInput === 0){
          filterValues[values].firstInput = null
        } 
        if(filterValues[values].secondInput === '' || filterValues[values].secondInput === 0){
          filterValues[values].secondInput = null
        } 
        if(filterValues[values].firstInput && filterValues[values].secondInput) {
          queryText += `${values} BETWEEN $${queryParams.length + 1} AND $${queryParams.length + 2}`
          queryParams.push(filterValues[values].firstInput, filterValues[values].secondInput)
        }
        if(filterValues[values].firstInput && !filterValues[values].secondInput) {
          queryText += `${values} >= $${queryParams.length + 1}`
          queryParams.push(filterValues[values].firstInput)
        }
        if(filterValues[values].secondInput && !filterValues[values].firstInput) {
          queryText += `${values} <= $${queryParams.length + 1}`
          queryParams.push(filterValues[values].secondInput)
        }
        
      }
    }
  }

  if(selectedSortColumn.column){
    queryText += ` ORDER BY ${selectedSortColumn.column} `
    if(selectedSortColumn.value === true){
      queryText += ` DESC`
    } else {
      queryText += ` ASC`
    }
  } else {
    queryText += ` ORDER BY mech_created_at DESC`
  }
  
  const countQueryText = queryText + ';'
  console.log(countQueryText);
  if(paginationData){
    queryText += ` LIMIT ${paginationData.pageSize} OFFSET ${paginationData.pageNumber * paginationData.pageSize};`
  } else {
    queryText += `;`
  }
  console.log(queryText, queryParams);
  pool.query(countQueryText, queryParams, (err, result) => {
    console.log('first');
    if(err) return res.json(err)

    const count = result.rowCount

    pool.query(queryText, queryParams, (err, result) => {
      console.log('second');
      if(err) return res.json(err)
  
      return res.json({mechanics: result.rows, count: count})
        
    })
  })
  
}

exports.main_mechanics_get

exports.mechanic_details_get = (req, res) => {
  const { mech_url } = req.query
  let queryText = `SELECT * FROM mechanics WHERE mech_url = $1`
  let queryValues = [mech_url]
  pool.query(queryText, queryValues, (err, result) => {
    if(err) return res.json(err)
    res.json({details: result.rows[0]})
  })
}

exports.mechanics_count_get = (req, res) => {
  let queryText = `SELECT * FROM mechanics;`
  pool.query(queryText, (err, result) => {
    if(err) return res.json(err)
    
    res.json({count : result.rowCount})
  })
}

exports.mechanics_delete = (req, res) => {
  const { mech_id } = req.query
  const queryText = `DELETE FROM mechanics WHERE mech_id = ${mech_id}`

  pool.query(queryText, (err, result) => {
    if(err) return res.status(500).json({message: "An error occurred while deleting the mechanic"})
    return res.json({mechanics: result.rowCount})
  })

}

exports.mechanics_patch = (req, res) => {

  let updateText =`UPDATE mechanics`
  let setText = ``
  let whereText = ` WHERE mech_id = $1`;
  let queryParams = [req.body.mech_id];
  let index = 2;

  Object.keys(req.body).map(col =>{
    if (col !== "mech_id") {
      if(index === 2) setText += ' SET '
      setText += `${setText && index !== 2 ? "," : ""} ${col} = $${index}`;
      queryParams.push(req.body[col]);
      index++;
    }

  })
  
  let queryText = updateText + setText + whereText + ';';
  console.log(queryText);
  console.log(queryParams);
  pool.query(queryText, queryParams, (err, result) =>{
    if(err) return res.json({ errors: err})
    res.json(result)
  })
}