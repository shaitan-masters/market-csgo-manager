const MarketManager = require('./../dist/MarketManager');
let error = null;
let marketManager;

module.exports = () => {
    describe('Valid creation', () => {

        afterEach(() => {
            marketManager = null;
            error = null;
        });

        test('create with init options object and key shall be ok', () => {
            const KEY_STRING = Math.random().toString(36).substring(7);
            marketManager = new MarketManager({
                APIKey: KEY_STRING
            });

            expect(error).toEqual(null);
            expect(marketManager instanceof MarketManager).toBe(true);

        });


    });

    describe('Invalid creation', () => {

        test('create without args shall throw error with errorType `client`', () => {


            try {
                APIProvider = new MarketManager();
            } catch (ex) {
                error = ex;
            }
            expect(error).not.toEqual(null);
            expect(error).toHaveProperty('errorType');
            expect(error.errorType).toEqual('client');
            expect(APIProvider instanceof MarketManager).not.toBe(true);

        });

        test('create with string  shall throw error with errorType `client`', () => {
            const STR = Math.random().toString(36).substring(7);
            try {
                APIProvider = new MarketManager(STR);
            } catch (ex) {
                error = ex;
            }
            expect(error).not.toEqual(null);
            expect(error).toHaveProperty('errorType');
            expect(error.errorType).toEqual('client');
            expect(APIProvider instanceof MarketManager).not.toBe(true);

        });
        test('create with empty object  shall throw error with errorType `client`', () => {

            try {
                APIProvider = new MarketManager({});
            } catch (ex) {
                error = ex;
            }
            expect(error).not.toEqual(null);
            expect(error).toHaveProperty('errorType');
            expect(error.errorType).toEqual('client');
            expect(APIProvider instanceof MarketManager).not.toBe(true);

        });


        test('create with integer shall throw error with errorType `client`' , () => {
            const INT = Math.floor(Math.random() * (10000 - -10000));
            try {
                APIProvider = new MarketManager(INT);
            } catch (ex) {
                error = ex;
            }
            expect(error).not.toEqual(null);
            expect(error).toHaveProperty('errorType');
            expect(error.errorType).toEqual('client');
            expect(APIProvider instanceof MarketManager).not.toBe(true);

        });

        test('create with float shall throw error with errorType `client`' , () => {
            const INT =  Math.random() * (10000 - -10000);
            try {
                APIProvider = new MarketManager(INT);
            } catch (ex) {
                error = ex;
            }
            expect(error).not.toEqual(null);
            expect(error).toHaveProperty('errorType');
            expect(error.errorType).toEqual('client');
            expect(APIProvider instanceof MarketManager).not.toBe(true);

        });

        test('create with null shall throw error with errorType `client`', () => {

            try {
                APIProvider = new MarketManager(null);
            } catch (ex) {
                 error = ex;
            }
            expect(error).not.toEqual(null);
            expect(error).toHaveProperty('errorType');
            expect(error.errorType).toEqual('client');
            expect(APIProvider instanceof MarketManager).not.toBe(true);

        });

        test('create with zero shall throw error with errorType `client`', () => {

            try {
                APIProvider = new MarketManager(0);
            } catch (ex) {
                 error = ex;
            }
            expect(error).not.toEqual(null);
            expect(error).toHaveProperty('errorType');
            expect(error.errorType).toEqual('client');
            expect(APIProvider instanceof MarketManager).not.toBe(true);

        });
    });

};
