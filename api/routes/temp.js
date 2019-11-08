function performPaginatedOperation(params,
    operationName) {
  
    return new Promise((resolve, reject) => {
      const dataWithKey = {
        lastEvaluatedKey: undefined,
        result: [],
        limit: []
      };
      
      const originalItemPerPageCount = params.Limit;
      params.Limit = params.Limit + 1;
      let remainingItemsCount = 0;
    
      dynamoDb[operationName](params, onScan);
  
  
      function onScan(err, data) {
          console.log("log requesr on second");
        if (err) {
          return reject(err);
        }
        dataWithKey.result = dataWithKey.result.concat(data.Items);
        dataWithKey.lastEvaluatedKey= data.LastEvaluatedKey;
        remainingItemsCount = (originalItemPerPageCount + 1) - dataWithKey.result.length;
        dataWithKey.limit.push(remainingItemsCount+ '-' + dataWithKey.result.length);

        if (remainingItemsCount > 0) {
          if (typeof data.LastEvaluatedKey === "undefined") {
            // pagination done, this is the last page as LastEvaluatedKey is undefined
            return resolve(dataWithKey);
          } else {
            // Continuing pagination for more data
            params.ExclusiveStartKey = data.LastEvaluatedKey;
            params.Limit = remainingItemsCount;
            return dynamoDb[operationName](params, onScan);
          }
        } else {
          dataWithKey.result = dataWithKey.result.slice(0, originalItemPerPageCount);
          // pagination done, but this is not the last page. making lastEvaluatedKey to
          dataWithKey.lastEvaluatedKey = dataWithKey.result[originalItemPerPageCount-1].id;
          }
          return resolve(dataWithKey);
        }
      }
    );
  }