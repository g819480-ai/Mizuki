'use strict';

const { MongoClient } = require('mongodb');

const {
    initAuthCreds,
    BufferJSON,
    proto
} = require('@whiskeysockets/baileys');

/*
 * SCANTY MD BOT
 * MongoDB authentication state for Baileys.
 *
 * Keeps:
 * - creds
 * - pre-key
 * - session
 * - sender-key
 * - sender-key-memory
 * - app-state-sync-key
 * - app-state-sync-version
 * - lid-mapping
 * - device-list
 * - all other Baileys key categories
 *
 * The actual MongoDB collections are preserved:
 * - whatsapp_auth
 * - whatsapp_auth_keys
 */

async function useMongoDBAuthState() {
    const uri = process.env.MONGO_URI;

    if (!uri) {
        throw new Error(
            'MONGO_URI is missing from environment variables'
        );
    }

    const dbName =
        process.env.MONGO_DB_NAME ||
        'scanty_md_bot';

    const sessionId =
        process.env.MONGO_SESSION_ID ||
        'scanty-md-bot';

    const client = new MongoClient(uri, {
        maxPoolSize: 10,
        minPoolSize: 1,
        retryWrites: true,
        retryReads: true
    });

    await client.connect();

    const db = client.db(dbName);

    const authCollection =
        db.collection('whatsapp_auth');

    const keysCollection =
        db.collection('whatsapp_auth_keys');

    /*
     * One document per Baileys key.
     *
     * This index is required so that simultaneous updates
     * cannot create duplicate key records.
     */
    await keysCollection.createIndex(
        {
            sessionId: 1,
            type: 1,
            keyId: 1
        },
        {
            unique: true
        }
    );

    /*
     * Helpful index for loading keys by category.
     */
    await keysCollection.createIndex({
        sessionId: 1,
        type: 1
    });

    const serialize = value =>
        JSON.stringify(
            value,
            BufferJSON.replacer
        );

    const deserialize = value =>
        JSON.parse(
            value,
            BufferJSON.reviver
        );

    /*
     * Load existing credentials.
     *
     * IMPORTANT:
     * Existing MongoDB authentication data is preserved.
     */
    const savedAuth =
        await authCollection.findOne({
            _id: sessionId
        });

    const creds =
        savedAuth?.creds
            ? deserialize(savedAuth.creds)
            : initAuthCreds();

    /*
     * MongoDB writes are serialized.
     *
     * Baileys can call keys.set() several times very quickly.
     * A queue prevents concurrent writes from fighting each other.
     */
    let writeQueue = Promise.resolve();

    const queueWrite = operation => {
        writeQueue = writeQueue
            .then(operation)
            .catch(error => {
                console.error(
                    'MongoDB auth write failed:',
                    error?.message || error
                );

                /*
                 * Do not permanently break the queue after
                 * one failed MongoDB operation.
                 */
            });

        return writeQueue;
    };

    const keys = {

        /*
         * Baileys asks MongoDB for Signal keys here.
         */
        get: async (type, ids) => {

            if (!Array.isArray(ids) || ids.length === 0) {
                return {};
            }

            const documents =
                await keysCollection
                    .find({
                        sessionId,
                        type,
                        keyId: {
                            $in: ids
                        }
                    })
                    .toArray();

            const stored =
                new Map(
                    documents.map(
                        doc => [
                            doc.keyId,
                            doc.value
                        ]
                    )
                );

            const result = {};

            for (const id of ids) {

                let value =
                    stored.has(id)
                        ? deserialize(
                            stored.get(id)
                        )
                        : undefined;

                /*
                 * Baileys specifically expects this
                 * object to be reconstructed as
                 * AppStateSyncKeyData.
                 */
                if (
                    type === 'app-state-sync-key' &&
                    value
                ) {
                    value =
                        proto.Message
                            .AppStateSyncKeyData
                            .fromObject(value);
                }

                result[id] = value;
            }

            return result;
        },

        /*
         * Baileys writes Signal/session keys here.
         */
        set: async data => {

            return queueWrite(
                async () => {

                    const operations = [];

                    for (
                        const category
                        of Object.keys(data || {})
                    ) {

                        const categoryData =
                            data[category];

                        if (
                            !categoryData ||
                            typeof categoryData !== 'object'
                        ) {
                            continue;
                        }

                        for (
                            const id
                            of Object.keys(categoryData)
                        ) {

                            const value =
                                categoryData[id];

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
                                                value:
                                                    serialize(
                                                        value
                                                    ),

                                                updatedAt:
                                                    new Date()
                                            },

                                            $setOnInsert: {
                                                sessionId,
                                                type: category,
                                                keyId: id,
                                                createdAt:
                                                    new Date()
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

                    if (
                        operations.length > 0
                    ) {
                        await keysCollection.bulkWrite(
                            operations,
                            {
                                ordered: false
                            }
                        );
                    }
                }
            );
        }
    };

    /*
     * Credentials are also serialized through the same
     * write queue.
     */
    const saveCreds = async () => {

        return queueWrite(
            async () => {

                await authCollection.updateOne(
                    {
                        _id: sessionId
                    },

                    {
                        $set: {
                            creds:
                                serialize(creds),

                            updatedAt:
                                new Date()
                        },

                        $setOnInsert: {
                            createdAt:
                                new Date()
                        }
                    },

                    {
                        upsert: true
                    }
                );
            }
        );
    };

    /*
     * Make sure the auth document exists even before
     * the first creds.update event.
     */
    if (!savedAuth) {

        await authCollection.updateOne(
            {
                _id: sessionId
            },

            {
                $set: {
                    creds:
                        serialize(creds),

                    updatedAt:
                        new Date(),

                    createdAt:
                        new Date()
                }
            },

            {
                upsert: true
            }
        );
    }

    console.log(
        'MongoDB WhatsApp authentication storage ready'
    );

    console.log(
        'MongoDB database:',
        dbName
    );

    console.log(
        'MongoDB session:',
        sessionId
    );

    console.log(
        'MongoDB existing credentials:',
        savedAuth ? 'YES' : 'NO'
    );

    return {

        state: {
            creds,
            keys
        },

        saveCreds,

        close: async () => {

            /*
             * Wait for pending auth writes before
             * closing MongoDB.
             */
            try {
                await writeQueue;
            } catch (_) {}

            await client.close();
        }
    };
}

module.exports = {
    useMongoDBAuthState
};
