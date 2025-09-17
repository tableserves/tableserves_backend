const queryOptimizer = (defaultLimit = 10, maxLimit = 100) => {
    return (req, res, next) => {
        // Parse query parameters
        const page = parseInt(req.query.page, 10) || 1;
        const limit = Math.min(
            parseInt(req.query.limit, 10) || defaultLimit,
            maxLimit
        );
        const sort = req.query.sort || '-createdAt';
        const fields = req.query.fields ? req.query.fields.split(',').join(' ') : '';

        // Add query options to request object
        req.queryOptions = {
            page,
            limit,
            skip: (page - 1) * limit,
            sort,
            fields
        };

        next();
    };
};

module.exports = queryOptimizer;