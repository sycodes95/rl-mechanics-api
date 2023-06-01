const { filter, filterLimit } = require("async");
const pool = require("../db");
const { search } = require("../routes");
const { query } = require("express");
const fs = require("fs");
const path = require("path");

exports.mechanics_post = (req, res, next) => {
  console.log(req.body);
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
   mech_gif
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  RETURNING *
  `;

  const body = req.body;

  const filename = req.file && req.file.filename ? req.file.filename : ""; 

  const values = [
    body.mech_name,
    body.mech_description,
    JSON.parse(body.mech_yt_url_controller),
    JSON.parse(body.mech_yt_url_kbm),
    body.mech_difficulty,
    body.mech_importance,
    body.mech_url,
    body.mech_type,
    JSON.parse(body.mech_training_packs),
    filename
  ];

  //"{" + JSON.parse(body.mech_training_packs).join(",") + "}",

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

      result.rows.forEach((mechanic) => {
        if (mechanic.mech_gif) {
          mechanic.mech_gif_url = `${process.env.UPLOADS}/${mechanic.mech_gif}`;
        }
      });

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

  
  req.body.mech_training_packs = JSON.parse(req.body.mech_training_packs)
  req.body.mech_yt_url_controller = JSON.parse(req.body.mech_yt_url_controller)
  req.body.mech_yt_url_kbm = JSON.parse(req.body.mech_yt_url_kbm)

  Object.keys(req.body).map((col) => {
    

    if (col != "mech_id" && col != "mech_gif_url") {

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

  if (req.file && req.file.filename) {

    const gifOnFile = `SELECT mech_gif FROM mechanics WHERE mech_id = $1`

    pool.query(gifOnFile, [req.body.mech_id], (err, result) => {
      if (err) {
        return console.error('Error retrieving current GIF filename:', err);
      }
      const currentGifFilename = result.rows[0].mech_gif;
      console.log(currentGifFilename);
      if(currentGifFilename && currentGifFilename != req.file.filename){

        fs.unlink(`./uploads/${currentGifFilename}`, (err) => {
          if (err) {
            console.error('Error deleting old GIF file:', err);
          } else {
            console.log('Old GIF file deleted successfully');
          }
        });
      }

    });

    if (index === 2) setText += " SET ";
    setText += `${setText && index !== 2 ? "," : ""} mech_gif = $${index}`;
    queryParams.push(req.file.filename);
    
  }

  let queryText = updateText + setText + whereText + ";";
  console.log(queryText, queryParams);
  pool.query(queryText, queryParams, (err, result) => {
    if (err) return res.json({ errors: err });
    res.json({ mechanic: result });
  });
};
