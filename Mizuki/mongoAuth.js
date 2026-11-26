
'use strict';

const { MongoClient } = require('mongodb');

/*
 * SCANTY MD BOT
 * MongoDB authentication storage for Baileys v7.
 * Existing MongoDB collections and session IDs are preserved.
 */

async function useMongoDBAuthState() {
    const {
        initAuthCreds,
        BufferJSON,
        proto
    } = await import('@whiskeysockets/baileys');

    const uri = process.env.MONGO_URI;

    if (!uri) {
        throw new Error('MONGO_URI is missing from environment variables');
    }

    const dbName = process.env.MONGO_DB_NAME || 'scanty_md_bot';
    const sessionId = process.env.MONGO_SESSION_ID || 'scanty-md-bot';

    const client = new MongoClient(uri, {
        maxPoolSize: 10,
        minPoolSize: 1,
        retryWrites: true,
        retryReads: true
    });

    await client.connect();

    try {
        const db = client.db(dbName);
        const authCollection = db.collection('whatsapp_auth');
        const keysCollection = db.collection('whatsapp_auth_keys');

        await keysCollection.createIndex(
            { sessionId: 1, type: 1, keyId: 1 },
            { unique: true }
        );

        await keysCollection.createIndex({
            sessionId: 1,
            type: 1
        });

        const serialize = value =>
            JSON.stringify(value, BufferJSON.replacer);

        const deserialize = value =>
            JSON.parse(value, BufferJSON.reviver);

        const savedAuth = await authCollection.findOne({
            _id: sessionId
        });

        const creds = savedAuth?.creds
            ? deserialize(savedAuth.creds)
            : initAuthCreds();

        let writeQueue = Promise.resolve();

        const queueWrite = operation => {
            const currentWrite = writeQueue.then(operation);

            writeQueue = currentWrite.catch(error => {
                console.error(
                    'MongoDB auth write failed:',
                    error?.message || error
                );
            });

            return currentWrite;
        };

        const keys = {
            get: async (type, ids) => {
                if (!Array.isArray(ids) || ids.length === 0) {
                    return {};
                }

                const documents = await keysCollection.find({
                    sessionId,
                    type,
                    keyId: { $in: ids }
                }).toArray();

                const stored = new Map(
                    documents.map(doc => [doc.keyId, doc.value])
                );

                const result = {};

                for (const id of ids) {
                    let value = stored.has(id)
                        ? deserialize(stored.get(id))
                        : undefined;

                    if (type === 'app-state-sync-key' && value) {
                        value = proto.Message.AppStateSyncKeyData.create(value);
                    }

                    result[id] = value;
                }

                return result;
            },

            set: async data => {
                return queueWrite(async () => {
                    const operations = [];

                    for (const category of Object.keys(data || {})) {
                        const categoryData = data[category];

                        if (!categoryData || typeof categoryData !== 'object') {
                            continue;
                        }

                        for (const id of Object.keys(categoryData)) {
                            const value = categoryData[id];

                            if (value) {
                                operations.push({
                                    updateOne: {
                                        filter: {
                                            sessionId,
                                            type: category,
                                            keyId: id
                                        },
                                        update: {
                                            $set: {
                                                value: serialize(value),
                                                updatedAt: new Date()
                                            },
                                            $setOnInsert: {
                                                sessionId,
                                                type: category,
                                                keyId: id,
                                                createdAt: new Date()
                                            }
                                        },
                                        upsert: true
                                    }
                                });
                            } else {
                                operations.push({
                                    deleteOne: {
                                        filter: {
                                            sessionId,
                                            type: category,
                                            keyId: id
                                        }
                                    }
                                });
                            }
                        }
                    }

                    if (operations.length === 0) return;

                    await keysCollection.bulkWrite(operations, {
                        ordered: true
                    });

                    console.log(
                        `MongoDB auth keys saved: ${operations.length}`
                    );
                });
            }
        };

        const saveCreds = async () => {
            return queueWrite(async () => {
                await authCollection.updateOne(
                    { _id: sessionId },
                    {
                        $set: {
                            creds: serialize(creds),
                            updatedAt: new Date()
                        },
                        $setOnInsert: {
                            createdAt: new Date()
                        }
                    },
                    { upsert: true }
                );

                console.log('MongoDB WhatsApp credentials saved');
            });
        };

        if (!savedAuth) {
            await authCollection.updateOne(
                { _id: sessionId },
                {
                    $set: {
                        creds: serialize(creds),
                        updatedAt: new Date(),
                        createdAt: new Date()
                    }
                },
                { upsert: true }
            );

            console.log('MongoDB initial WhatsApp credentials created');
        }

        console.log('MongoDB WhatsApp authentication storage ready');
        console.log('MongoDB database:', dbName);
        console.log('MongoDB session:', sessionId);
        console.log('MongoDB existing credentials:', savedAuth ? 'YES' : 'NO');

        return {
            state: {
                creds,
                keys
            },

            saveCreds,

            close: async () => {
                await writeQueue;
                await client.close();
                console.log('MongoDB WhatsApp authentication storage closed');
            }
        };
    } catch (error) {
        await client.close();
        throw error;
    }
}

module.exports = {
    useMongoDBAuthState
};
