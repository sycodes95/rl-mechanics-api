const { filter, filterLimit } = require("async");
const pool = require("../db");
const { search } = require("../routes");
const { query } = require("express");
const fs = require("fs");
const path = require("path");

exports.mechanics_post = (req, res, next) => {
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
   mech_type,
   mech_training_packs,
   mech_prerequisites,
   mech_gif
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  RETURNING *
  `;

  const body = req.body;

  //check if mech_gif is not empty, if it has a url then add /ifr to transform it to a iframe link
  if(req.body.mech_gif && !req.body.mech_gif.includes('.com/ifr/')){
    let gifUrl = req.body.mech_gif.split('.com/')
    req.body.mech_gif = gifUrl[0] + '.com/ifr/' + gifUrl[1]
  }
  
  const values = [
    body.mech_name,
    body.mech_description,
    body.mech_yt_url_controller,
    body.mech_yt_url_kbm,
    body.mech_difficulty,
    body.mech_importance,
    body.mech_url,
    body.mech_type,
    body.mech_training_packs,
    body.mech_prerequisites,
    body.mech_gif
  ];

  pool.query(queryText, values, (err, result) => {
    if (err) return res.json(err);

    return res.json({ mechanic: result.rows[0] });
  });
};

exports.mechanics_get = (req, res, next) => {
  const searchValue = req.query.searchValue;
  const filterValues = JSON.parse(req.query.filterValues);
  const sortColumn = JSON.parse(req.query.sortColumn);
  const paginationData = JSON.parse(req.query.paginationData);

  let queryText = `SELECT * FROM mechanics`;
  let queryParams = [];

  if (searchValue) {
    queryText += queryParams.length ? " AND " : " WHERE ";

    queryText += `
    (mech_name::text ILIKE $${queryParams.length + 1}
    OR mech_type::text ILIKE $${queryParams.length + 1}
    )`;

    queryParams.push(`%${searchValue}%`);
  }

  if (filterValues) {
    Object.keys(filterValues).forEach((key) => {
      if (filterValues[key]) {
        queryText += queryParams.length ? " AND " : " WHERE ";
        queryText += `${key} = $${queryParams.length + 1}`;
        queryParams.push(filterValues[key]);
      }
    });
  }

  if (sortColumn.column) {
    queryText += ` ORDER BY ${sortColumn.column} `;
    queryText += sortColumn.value ? ` DESC` : ` ASC`;
  } else {
    queryText += ` ORDER BY mech_created_at DESC`;
  }

  const countQueryText = queryText + ";";

  if (paginationData) {
    queryText += ` LIMIT ${paginationData.pageSize} OFFSET ${
      paginationData.pageNumber * paginationData.pageSize
    };`;
  } else {
    queryText += `;`;
  }

  console.log(queryText, queryParams);
  pool.query(countQueryText, queryParams, (err, result) => {
    if (err) return res.json(err);

    const count = result.rowCount;

    pool.query(queryText, queryParams, (err, result) => {
      if (err) return res.json(err);

      // result.rows.forEach((mechanic) => {
      //   if (mechanic.mech_gif) {
      //     mechanic.mech_gif_url = `${process.env.UPLOADS}/${mechanic.mech_gif}`;
      //   }
      // });

      return res.json({ mechanics: result.rows, count: count });
    });
  });
};

exports.mechanic_details_get = (req, res) => {
  const { mech_url } = req.query;
  let queryText = `SELECT * FROM mechanics WHERE mech_url = $1`;
  let queryValues = [mech_url];
  pool.query(queryText, queryValues, (err, result) => {
    if (err) return res.json(err);
    res.json({ details: result.rows[0] });
  });
};

exports.mechanics_count_get = (req, res) => {
  let queryText = `SELECT * FROM mechanics;`;
  pool.query(queryText, (err, result) => {
    if (err) return res.json(err);

    res.json({ count: result.rowCount });
  });
};

exports.mechanics_urls_get = (req, res) => {
  let queryText = `SELECT mech_name, mech_url FROM mechanics;`;
  pool.query(queryText, (err, result) => {
    if (err) return res.json(err);

    res.json({ urls : result.rows});
  });
};

exports.mechanics_delete = (req, res) => {
  const { mech_id } = req.query;
  const queryText = `DELETE FROM mechanics WHERE mech_id = ${mech_id}`;

  pool.query(queryText, (err, result) => {
    if (err)
      return res
        .status(500)
        .json({ message: "An error occurred while deleting the mechanic" });
    return res.json({ mechanics: result.rowCount });
  });
};

exports.mechanics_patch = (req, res) => {
  let updateText = `UPDATE mechanics`;
  let setText = ``;
  let whereText = ` WHERE mech_id = $1`;
  let queryParams = [req.body.mech_id];
  let index = 2;

  Object.keys(req.body).map((col) => {

    if (col != "mech_id") {

      if(col === 'mech_gif'){
        //check if mech_gif is not empty, if it has a url then add /ifr to transform it to a iframe link
        if(req.body[col] && !req.body[col].includes('.com/ifr/')){
          let gifUrl = req.body[col].split('.com/')
          req.body[col] = gifUrl[0] + '.com/ifr/' + gifUrl[1]
        }
      }

      if (index === 2) setText += " SET ";
      setText += `${setText && index !== 2 ? "," : ""} ${col} = $${index}`;

      if (req.body[col] && typeof req.body[col] === "string" && !isNaN(Number(req.body[col]))) {
        //if value is number type
        queryParams.push(Number(req.body[col]));
      } else {
        queryParams.push(req.body[col]);
      }

      index++;
    }
  });


  let queryText = updateText + setText + whereText + ";";
  pool.query(queryText, queryParams, (err, result) => {
    if (err) return res.json({ errors: err });
    res.json({ mechanic: result });
  });
};
