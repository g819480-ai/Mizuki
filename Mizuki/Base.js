/*

* SCANTY MD BOT
* Copyright (C) 2026 Scanty Ads
* Licensed under the GNU General Public License v3.0.
* You may redistribute and/or modify this file under the terms
* of the GNU General Public License as published by the
* Free Software Foundation, either version 3 of the License,
* or any later version.
    */

‘use strict’;

class Base {
constructor(client) {
Object.defineProperty(this, ‘client’, { value: client });
}

_clone() {
    return Object.assign(Object.create(this), this);
}
_patch(data) {
    return data;
}

}

module.exports = Base;
