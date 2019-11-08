const AWS = require('aws-sdk');
const express = require('express');
const uuid = require('uuid');

const router = express.Router();

const EMPLOYEES_TABLE = process.env.TABLE;

const dynamoDb = new AWS.DynamoDB.DocumentClient();

router.get('/', (req, res) => {
    // let page = req.query.page;
    let limit = req.query.limit;
    let search = req.query.search;
    let lKey= req.query.lKey;
    let operationName= 'scan';
    
    let params = {
        TableName: EMPLOYEES_TABLE,
        IndexName: 'name-index'
    }

    if(limit){
        params.Limit= parseInt(limit);
    }else{
        params.Limit= 100000;
    }
  
    // check for lastEvaluatedKey in parameter and sets the ExclusiveStartKey
    if(lKey){
        const strParam= lKey.split(",");
        params.ExclusiveStartKey = { 
            id: strParam[0], 
            name : strParam[1] 
        } ;
    }

    // if serachtext is available sets filter params
    if (search && search!== '') {
        params.FilterExpression = "contains (#name, :searchVal)", //or contains (#email, :searchVal)
        params.ExpressionAttributeNames = {
            "#name": "name"
        };
        params.ExpressionAttributeValues =
        {
            ":searchVal":  search 
        };
        
    } 

    // return data initialized
    const dataWithKey = {
        LastEvaluatedKey: undefined,
        Items: []
      };
    var actualCount = params.limit;

    // scanExecute is called till it returns the no of items requested or till it reached end of  
    var scanExecute = function() {
        dynamoDb[operationName](params, function (err, result) {
            
            const originalItemPerPageCount = params.Limit;

            params.Limit = params.Limit + 1;
            let remainingItemsCount = 0;

            if (err) {
                res.status(400).json({ error: 'Error fetching the employees' });
            } else {
                dataWithKey.Items = dataWithKey.Items.concat(result.Items);
                dataWithKey.lastEvaluatedKey= result.LastEvaluatedKey;
                remainingItemsCount= (originalItemPerPageCount) - result.Items.length;

                if (remainingItemsCount > 0) {
                    if (typeof result.LastEvaluatedKey === "undefined") {
                        // pagination done, this is the last page as LastEvaluatedKey is undefined
                        return res.json(dataWithKey);
                    } else {
                        // Continuing pagination for more data
                        params.ExclusiveStartKey = result.LastEvaluatedKey;
                        params.Limit = remainingItemsCount;
                        scanExecute();
                    }
                } else {
                    if(actualCount<dataWithKey.Items.length){
                        dataWithKey.Items = dataWithKey.Items.slice(0, actualCount);
                        // pagination done, but this is not the last page. making lastEvaluatedKey to
                        dataWithKey.lastEvaluatedKey = {
                            id: dataWithKey.Items[actualCount - 1].id,
                            name: dataWithKey.Items[actualCount - 1].name
                        }
                    }
                    return res.json(dataWithKey);
                }
            }
        });
    }
    scanExecute();
});

router.get('/:id', (req, res) => {
    const id = req.params.id;
    const params = {
        TableName: EMPLOYEES_TABLE,
        Key: {
            id
        }
    };
    dynamoDb.get(params, (error, result) => {
        if (error) {
            res.status(400).json({ error: 'Error retrieving Employee' });
        }
        if (result.Item) {
            res.json(result.Item);
        } else {
            res.status(404).json({ error: `Employee with id: ${id} not found` });
        }
    });
});

router.post('/', (req, res) => {
    const id = uuid.v4();
    const name = req.body.name;
    const email = req.body.email;
    const mobile = req.body.mobile;
    const roleType = req.body.roleType;
    const status = req.body.status;
    const createdDate = Date.now();

    const params = {
        TableName: EMPLOYEES_TABLE,
        Item: {
            id,
            name,
            email,
            mobile,
            roleType,
            status,
            createdDate
        },
    };
    dynamoDb.put(params, (error) => {
        if (error) {
            res.status(400).json({ error: 'Could not create Employee' });
        }
        res.json({
            id,
            name,
            email,
            mobile,
            roleType,
            status,
            createdDate
        });
    });
});

router.delete('/:id', (req, res) => {
    const id = req.params.id;
    const params = {
        TableName: EMPLOYEES_TABLE,
        Key: {
            'id': id
        }
    };
    dynamoDb.delete(params, (error) => {
        if (error) {
            res.status(400).json({ error: 'Could not delete Employee' });
        }
        res.json({ success: true });
    });
});

router.put('/:id', (req, res) => {
    let id = req.params.id;
    let name = req.body.name;
    let email = req.body.email;
    let mobile = req.body.mobile;
    let roleType = req.body.roleType;
    const modifiedDate = Date.now();

    const params = {
        TableName: EMPLOYEES_TABLE,
        Key: {
            'id': id
        },
        UpdateExpression: 'set #name = :name, #email = :email, #mobile = :mobile, #roleType = :roleType, #modifiedDate = :modifiedDate',
        ExpressionAttributeNames: { 
            '#name': 'name',
            '#email': 'email',
            '#mobile': 'mobile',
            '#roleType': 'roleType',
            '#modifiedDate': 'modifiedDate'
         },
        ExpressionAttributeValues: { 
            ':name': name,
            ':email': email,
            ':mobile': mobile,
            ':roleType': roleType,
            ':modifiedDate': modifiedDate
         },
        ReturnValues: "ALL_NEW"
    }
    dynamoDb.update(params, (error, result) => {
        if (error) {
            res.status(400).json({ error: 'Could not update Employee' });
        }
        res.json(result.Attributes);
    })
});



module.exports = router;