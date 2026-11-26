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
 * Preserves:
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
 * Existing MongoDB collections:
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
     * One MongoDB document per Baileys key.
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
     * Helpful index for loading keys
     * by authentication category.
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
     * Existing MongoDB authentication data
     * is preserved.
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
     * Baileys can update many Signal keys
     * very quickly.
     *
     * We serialize MongoDB writes so that
     * concurrent writes cannot overwrite
     * each other incorrectly.
     *
     * IMPORTANT:
     * A failed MongoDB write is NOT swallowed.
     * Baileys receives the failure so we know
     * authentication state was not safely saved.
     */
    let writeQueue = Promise.resolve();

    const queueWrite = operation => {
        const currentWrite =
            writeQueue.then(operation);

        /*
         * Keep the queue usable after a failure,
         * while still returning the failure to
         * the caller.
         */
        writeQueue =
            currentWrite.catch(error => {
                console.error(
                    'MongoDB auth write failed:',
                    error?.message || error
                );

                /*
                 * Do not break the queue permanently.
                 * The current operation still rejects.
                 */
            });

        return currentWrite;
    };

    const keys = {

        /*
         * Baileys asks for Signal keys here.
         */
        get: async (type, ids) => {

            if (
                !Array.isArray(ids) ||
                ids.length === 0
            ) {
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
                 * Baileys expects app-state-sync-key
                 * values as AppStateSyncKeyData.
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
         * Baileys saves Signal/session keys here.
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

                            /*
                             * Save/update key.
                             */
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

                            }

                            /*
                             * Baileys uses undefined/null
                             * to indicate a key should
                             * be removed.
                             */
                            else {

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
                        operations.length === 0
                    ) {
                        return;
                    }

                    await keysCollection.bulkWrite(
                        operations,
                        {
                            ordered: true
                        }
                    );

                    console.log(
                        `MongoDB auth keys saved: ${operations.length}`
                    );
                }
            );
        }
    };

    /*
     * Save credentials.
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

                console.log(
                    'MongoDB WhatsApp credentials saved'
                );
            }
        );
    };

    /*
     * Make sure the credentials document
     * exists before the first creds.update.
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

        console.log(
            'MongoDB initial WhatsApp credentials created'
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
             * Wait for pending writes before
             * closing MongoDB.
             */
            try {
                await writeQueue;
            } catch (error) {
                console.error(
                    'MongoDB auth queue closed with error:',
                    error?.message || error
                );
            }

            await client.close();

            console.log(
                'MongoDB WhatsApp authentication storage closed'
            );
        }
    };
}

module.exports = {
    useMongoDBAuthState
};
