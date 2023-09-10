
const logger  = require('./utils/server-logger');
module.exports = class ServerController {
    constructor(redisClient, firebaseHelperClass) {
        this.firebaseHelper = firebaseHelperClass;
        this.redisClient = redisClient;
    }


    fetchAllDocs = async (req, res) => {
        const storageName = req.url.split('/')[2];
        let client = this.redisClient;

        
        client.hGet('isCached', `cache-${storageName}`).then((isCached) => {       
            if (isCached && isCached === 'true') {
            
                let results = []
                let items = client.hGetAll(storageName)
                items.then((data) => {
                    Object.keys(data).forEach(function (key) {
                        let file = {...JSON.parse(data[key]), id : key};
                        results.push(file);
                    });
                    res.status(200).send(results);
                }).catch((err) => {
                    logger.error(`Failed to fetch cache: ${err} || ${req.ip} - ${req.headers['user-agent']}`);
                    res.status(500).send({ error: err });
                });

            }else{
                this.firebaseHelper.getDocsFromFirebaseDatabase(storageName).then((data) => {
                    for (const doc of data) {
                        client.hSet(storageName, doc['id'], JSON.stringify(doc));
                    }
                    client.hSet('isCached', `cache-${storageName}`, 'true');
                    res.status(200).send(data);
                }).catch((err) => {
                    logger.error(`Failed to fetch from firebase: ${err} || ${req.ip} - ${req.headers['user-agent']}`);
                    res.status(502).send({
                        error: 'Failed to get necessary data'
                    })
                });
            }
        }).catch((err) => {
            logger.error(`Failed to fetch from cache status: ${err} || ${req.ip} - ${req.headers['user-agent']}`);
            res.status(500).send({
                error: 'Failed to get necessary data'
            })
        });

    };


    fetchDocsByTag = async (req, res) => {
        const storageName = req.url.split('/')[2];
        let client = this.redisClient;

        let tag = decodeURIComponent(req.params.tag);
        logger.error(`No tag in request: ${req.url} - ${req.ip} - ${req.headers['user-agent']}`);
        if (!tag) res.status(400).send({ error: "No tag found in request" })

        client.hGet('isCached', `cache-${storageName}`).then((isCached) => {
            if (isCached === 'true') {
                let results = []
                let items = client.hGetAll(storageName)
                items.then((data) => {
                    Object.keys(data).forEach(function (key) {
                        let file = {...JSON.parse(data[key]), id : key};
                        if(file['tags'].includes(tag)){
                            results.push(file);
                        }
                        
                    });
                    res.status(200).send(results);
                }).catch((err) => {
                    logger.error(`Failed to fetch from cache: ${err} || ${req.ip} - ${req.headers['user-agent']}`);
                    res.status(500).send({ error: err });
                });

            }else{
                this.firebaseHelper.getDocsFromFirebaseDatabase(storageName).then((data) => {
                    let results = []
                    for (const doc of data) {
                        client.hSet(storageName, doc['id'], JSON.stringify(doc));
                        if(doc['tags'].includes(tag)){
                            results.push(file);
                        }
                    }
                    client.hSet('isCached', `cache-${storageName}`, 'true');
                    res.status(200).send(results);
                }).catch((err) => {
                    logger.error(`Failed to fetch from firebase: ${err} || ${req.ip} - ${req.headers['user-agent']}`);
                    res.status(502).send({
                        error: 'Failed to get necessary data'
                    })
                });
            }

        }).catch((err) => {
            logger.error(`Failed to fetch cache status: ${err} || ${req.ip} - ${req.headers['user-agent']}`);
            res.status(500).send({
                error: 'Failed to get necessary data'
            })
        });

    };


    fetchDocById = async (req, res) => {
        const storageName = req.url.split('/')[2];
        let client = this.redisClient;

        let id = req.params.id;
        if (!id) res.status(400).send({ error: "No id found in request" })

        let serverSideRendering = req.params.ssr;

        let exists = client.exists(storageName, id);
        exists.then((reply) => {
            if (reply == 1) {
                client.hGet(storageName, id).then((data) => {
                    let blog = {...JSON.parse(data)};

                    res.status(200).send(blog);
                }).catch((err) => {
                    logger.error(`Failed to fetch from cache: ${err} || ${req.ip} - ${req.headers['user-agent']}`);
                    res.status(502).send({
                        error: 'Failed to get necessary data'
                    });
                });
            } else {
                this.firebaseHelper.getSpecificDocFromFirebase(storageName, id).then((data) => {
                    client.hSet(storageName, id, JSON.stringify(data));
                    let blog = {...data};

                    res.status(200).send(blog);
                }).catch((err) => {
                    logger.error(`Failed to fetch from firebase: ${err} || ${req.ip} - ${req.headers['user-agent']}`);
                    res.status(502).send({
                        error: 'Failed to get necessary data'
                    });
                })
            }
        }).catch((err) => {
            logger.error(`Failed to fetch cache status: ${err} || ${req.ip} - ${req.headers['user-agent']}`);
            res.status(502).send({
                error: 'Failed to get necessary data'
            });
        });

    }

    updateDoc = async (req, res) => {
        const storageName = req.url.split('/')[2];
        let client = this.redisClient;
        let id = req.params.id;
        let updatedObject = req.body.doc;

        this.firebaseHelper.updateDocOnFirebaseDatabase(storageName, updatedObject).then((_) => {
            client.hGet(storageName, id).then((data) => {
                let obj = JSON.parse(data);

                // updating the object with the new one
                let newObj = Object.keys(obj).reduce((accumulator, key) => {
                    return { ...accumulator, [key]: updatedObject[key] ? updatedObject[key] : obj[key] };
                }, {});

                client.hSet(storageName, id, JSON.stringify(newObj));
                logger.warn(`Updated document ${storageName}-${id} || ${req.ip} - ${req.headers['user-agent']}`);
                res.status(200).send({message : "Successful update"});
            }).catch((err) => {
                logger.error(`Failed to update doc in cache: ${err} || ${req.ip} - ${req.headers['user-agent']}`);
                res.status(502).send({
                    error: 'Failed to get necessary data'
                });
            });
        }).catch((err) => {
            logger.error(`Failed to update doc in firebase: ${err} || ${req.ip} - ${req.headers['user-agent']}`);
            res.status(500).send({ error: err });
        });
        

    }

    deleteDoc = async (req, res) => {
        const storageName = req.url.split('/')[2];
        let client = this.redisClient;
        let id = req.params.id;

        this.firebaseHelper.deleteDocOnFirebaseDatabase(storageName, id).then((_) => {
            let deleteRef = client.hDel(storageName, id);
            deleteRef.then((_) => {
                logger.warn(`deleted document ${storageName}-${id} || ${req.ip} - ${req.headers['user-agent']}`);
                res.status(200).send(({ message: 'deleted successfully' }));
            }).catch((err) => {
                logger.error(`Failed to delete from cache: ${err} || ${req.ip} - ${req.headers['user-agent']}`);
                res.status(500).send({ error: err })
            })
        }).catch((err) => { 
            logger.error(`Failed to delete from firebase: ${err} || ${req.ip} - ${req.headers['user-agent']}`);
            res.status(500).send({ error: err }) 
    });
    }

    deleteFile = async (req, res) => {
        const storageName = req.url.split('/')[2];
        let client = this.redisClient;
        let id = req.params.id;

        client.hGet(storageName, id).then((data) => {
            let file = JSON.parse(data);

            this.firebaseHelper.deleteFileFromStorage(storageName, file).then((_) => {
                let deleteRef = client.hDel(storageName, id);
                deleteRef.then((_) => {
                    logger.warn(`deleted file ${storageName}-${id} || ${req.ip} - ${req.headers['user-agent']}`);
                    res.status(200).send(({ message: 'deleted successfully' }));
                }).catch((err) => {
                    logger.error(`Failed to delete from cache: ${err} || ${req.ip} - ${req.headers['user-agent']}`);
                    res.status(500).send({ error: err })
                })
            }).catch((err) => { 
                logger.error(`Failed to delete from firebase: ${err} || ${req.ip} - ${req.headers['user-agent']}`);
                res.status(500).send({ error: err })
            });

        }).catch((err) => {
            logger.error(`Failed to fetch cache status: ${err} || ${req.ip} - ${req.headers['user-agent']}`);
            res.status(502).send({
                error: 'Failed to get necessary data'
            });
        });

    }

    setSingleItemToActive = async (req, res) => {
        const storageName = req.url.split('/')[2];
        let client = this.redisClient;
        let id = req.params.id;

        var updatedItems = []

        let items = client.hGetAll(storageName)
        items.then((data) => {
            Object.keys(data).forEach(function (key) {
                let oldItem = JSON.parse(data[key])
                let newObject = { ...oldItem, active: false, html : '' };

                if (key === id) {
                    newObject = { ...newObject, active: true}
                }
                updatedItems.push(newObject);

            });
            this.firebaseHelper.updateMultipleDocsInFirebaseDatabase(storageName, updatedItems).then((_) => {
                updatedItems.forEach((doc) => {
                    client.hSet(storageName, doc['id'], JSON.stringify(doc));
                })
                logger.warn(`set ${storageName}-${id} to active successfully || ${req.ip} - ${req.headers['user-agent']}`);
                res.status(200).send({ message: 'Item set to active successfully' });
            }).catch((err) => {
                logger.error(`Failed to update on firebase: ${err} || ${req.ip} - ${req.headers['user-agent']}`);
                res.status(500).send({ error: `Error from db: ${err}` });
            });
        }).catch((err) => {
            logger.error(`Failed to update item : ${err} || ${req.ip} - ${req.headers['user-agent']}`);
            res.status(500).send({ error: `Error reading from cache: ${err}` });
        });

    }

    postDoc = async (req, res) => {
        const storageName = req.url.split('/')[2];
        let client = this.redisClient;
        let doc = req.body.doc;

        this.firebaseHelper.postDocToFirebaseDatabase(storageName, doc).then((data) => {
            let doc = data['doc'];
            client.hSet(storageName, doc['id'], JSON.stringify(doc));
            logger.warn(`posted ${doc['id']} in ${storageName} successfully || ${req.ip} - ${req.headers['user-agent']}`);
            res.status(200).send({ message: 'Posted successfully' });
        }).catch((err) => {
            logger.error(`Failed to add file to firebase: ${err} || ${req.ip} - ${req.headers['user-agent']}`);
            res.status(500).send({ error: err });
        });
    }

    cacheFileInfo(storageName, doc) {
        /**
         * Upload via controller was tricky so it's done in the server now.
         */
        let client = this.redisClient;
        return new Promise((resolve, reject) => {
            try {
                client.hSet(storageName, doc['id'], JSON.stringify(doc));
                resolve({ message: 'Successfully saved' });
            } catch (error) {
                logger.error(`Failed to cache file info: ${err} || ${req.ip} - ${req.headers['user-agent']}`);
                reject({ err: error });
            }
        });
    }

    verifyToken(token){
        return this.firebaseHelper.verifyIdToken(token);
    }
}