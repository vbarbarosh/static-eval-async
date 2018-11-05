const methods = {
    ArrayExpression,
    BinaryExpression,
    CallExpression,
    ConditionalExpression,
    ExpressionStatement,
    FunctionExpression,
    Identifier,
    Literal,
    LogicalExpression: BinaryExpression,
    MemberExpression,
    ObjectExpression,
    ReturnStatement,
    TaggedTemplateExpression,
    TemplateElement,
    TemplateLiteral,
    ThisExpression,
    UnaryExpression,
};

function static_eval_async(node, vars)
{
    return new Promise(function (resolve, reject) {
        walk(node, vars||{}, reject, resolve);
    });
}

function walk(node, vars, reject, resolve)
{
    const method = methods[node.type];
    if (method) {
        method(node, vars, reject, resolve);
    }
    else {
        reject(new Error(`Not Implemented: ${node.type}`));
    }
}

function walk_array(nodes, vars, reject, resolve)
{
    if (nodes.length == 0) {
        return void resolve([]);
    }

    let pending = nodes.length;
    const ret = Array(pending);
    nodes.forEach(function (node, index) {
        walk(node, vars, rej, res);
        function rej(error) {
            if (pending != 0) {
                pending = 0;
                reject(error);
            }
        }
        function res(value) {
            if (pending != 0) {
                ret[index] = value;
                if (--pending == 0) {
                    resolve(ret);
                }
            }
        }
    });
}

function ArrayExpression(node, vars, reject, resolve)
{
    walk_array(node.elements, vars, reject, resolve);
}

function BinaryExpression(node, vars, reject, resolve)
{
    walk_array([node.left, node.right], vars, reject, function (value) {
        const [left, right] = value;
        switch (node.operator) {
        case '+': resolve(left + right); break;
        case '-': resolve(left - right); break;
        case '*': resolve(left * right); break;
        case '/': resolve(left / right); break;
        case '%': resolve(left % right); break;
        case '<': resolve(left < right); break;
        case '>': resolve(left > right); break;
        case '|': resolve(left | right); break;
        case '&': resolve(left & right); break;
        case '^': resolve(left ^ right); break;
        case '==': resolve(left == right); break;
        case '!=': resolve(left != right); break;
        case '<=': resolve(left <= right); break;
        case '>=': resolve(left >= right); break;
        case '&&': resolve(left && right); break;
        case '||': resolve(left || right); break;
        case '===': resolve(left === right); break;
        case '!==': resolve(left !== right); break;
        default:
            reject(new Error(`Invalid operator ${node.operator}`));
            break;
        }
    });
}

function CallExpression(node, vars, reject, resolve)
{
    walk(node.callee, vars, reject, function (callee) {
        if (typeof callee !== 'function') {
            return void reject(new Error(`Cannot call ${typeof callee}`));
        }
        if (node.callee.object) {
            walk(node.callee.object, vars, reject, function (ctx) {
                walk_array(node.arguments, vars, reject, function (args) {
                    exec(ctx, args);
                });
            });
        }
        else {
            walk_array(node.arguments, vars, reject, function (args) {
                exec(null, args);
            });
        }
        function exec(ctx, args) {
            const ret = callee.apply(ctx, args);
            if (ret && typeof ret.then == 'function') {
                ret.then(resolve).catch(reject);
            }
            else {
                resolve(ret);
            }
        }
    });
}

function ConditionalExpression(node, vars, reject, resolve)
{
    walk(node.test, vars, reject, function (value) {
        if (value) {
            walk(node.consequent, vars, reject, resolve);
        }
        else {
            walk(node.alternate, vars, reject, resolve);
        }
    });
}

function ExpressionStatement(node, vars, reject, resolve)
{
    reject(new Error('Not Implemented: ExpressionStatement'));
}

function FunctionExpression(node, vars, reject, resolve)
{
    reject(new Error('Not Implemented: FunctionExpression'));
}

function Identifier(node, vars, reject, resolve)
{
    if ({}.hasOwnProperty.call(vars, node.name)) {
        resolve(vars[node.name]);
    }
    else {
        reject(new Error(`Invalid identifier: ${node.name}`));
    }
}

function Literal(node, vars, reject, resolve)
{
    resolve(node.value);
}

function MemberExpression(node, vars, reject, resolve)
{
    walk(node.object, vars, reject, function (object) {
        // Do not allow access to methods on Function
        if (typeof object == 'function') {
            return void reject(new Error(`It is forbidden to access to methods on Function`));
        }
        if (node.property.type === 'Identifier') {
            return void resolve(object[node.property.name]);
        }
        walk(node.property, vars, reject, function (property) {
            resolve(object[property]);
        });
    });
}

function ObjectExpression(node, vars, reject, resolve)
{
    let pending = node.properties.length;
    const ret = {};
    if (pending == 0) {
        return void resolve(ret);
    }
    node.properties.forEach(function (property) {
        if (property.value === null) {
            ret[property.key.value || property.key.name] = null;
            if (--pending == 0) {
                resolve(ret);
            }
        }
        else {
            walk(property.value, vars, rej, res);
            function rej(error) {
                if (pending != 0) {
                    pending = 0;
                    reject(error);
                }
            }
            function res(value) {
                if (pending != 0) {
                    ret[property.key.value || property.key.name] = value;
                    if (--pending == 0) {
                        resolve(ret);
                    }
                }
            }
        }
    });
}

function ReturnStatement(node, vars, reject, resolve)
{
    walk(node.argument, vars, reject, resolve);
}

function TaggedTemplateExpression(node, vars, reject, resolve)
{
    walk_array([node.tag].concat(node.quasi.quasis).concat(node.quasi.expressions), vars, reject, function (items) {
        const quasis = items.slice(1, node.quasi.quasis.length + 1);
        const expressions = items.slice(node.quasi.quasis.length + 1);
        resolve(items[0].call(null, quasis, ...expressions));
    });
}

function TemplateElement(node, vars, reject, resolve)
{
    resolve(node.value.cooked);
}

function TemplateLiteral(node, vars, reject, resolve)
{
    walk_array(node.quasis.slice().concat(node.expressions), vars, reject, function (items) {
        const quasis = items.slice(0, node.quasis.length);
        const expressions = items.slice(node.quasis.length);
        let ret = '';
        expressions.forEach((v,i) => ret += quasis[i] + v);
        resolve(ret + quasis[expressions.length]);
    });
}

function ThisExpression(node, vars, reject, resolve)
{
    if ({}.hasOwnProperty.call(vars, 'this')) {
        resolve(vars['this']);
    }
    else {
        reject(new Error('Invalid identifier: this'));
    }
}

function UnaryExpression(node, vars, reject, resolve)
{
    walk(node.argument, vars, reject, function (value) {
        switch (node.operator) {
        case '+': resolve(+value); break;
        case '-': resolve(-value); break;
        case '~': resolve(~value); break;
        case '!': resolve(!value); break;
        default:
            reject(new Error(`Invalid operator ${node.operator}`));
            break;
        }
    });
}

module.exports = static_eval_async;
