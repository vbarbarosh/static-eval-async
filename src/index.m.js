import * as esprima from 'esprima';
import static_eval_async from '.';

describe('static_eval_async', function () {
    xit('should handle empty input', async function () {
        assert(await static_eval_async());
    });
    it('should handle ArrayExpression', async function () {
        assert.deepEqual(await exec('[1,2,3]'), [1,2,3]);
    });
    it('should handle BinaryExpression', async function () {
        assert(await exec('1+2') === 3);
        assert(await exec('1-2') === -1);
        assert(await exec('1*2') === 2);
        assert(await exec('1/2') === 0.5);
        assert(await exec('1%2') === 1);
        assert(await exec('0x0f|0xf0') === 0xff);
        assert(await exec('0x0f&0x04') === 0x04);
        assert(await exec('0x0f^0x04') === 0x0b);
    });
    it('should handle CallExpression', async function () {
        assert(await exec('pow(2,4)', {pow}) === 16);
        assert(await exec('pow(2,4)+1', {pow}) === 17);
    });
    it('should handle CallExpression with async functions', async function () {
        assert(await exec('pow_async(2,4)', {pow_async}) === 16);
        assert(await exec('pow_async(2,4)+1', {pow_async}) === 17);
    });
    it('should handle ConditionalExpression', async function () {
        assert(await exec('pow_async(2,4) == 16 ? "YES" : "NO"', {pow_async}) === 'YES');
    });
    xit('should handle ExpressionStatement', async function () {
        const trace = [];
        function foo() { trace.push('foo'); }
        function bar() { trace.push('bar'); }
        function baz() { return trace.join(); }
        assert(await exec('(function(){ foo(); bar(); return baz(); })()', {foo,bar,baz}) === 'foo,bar');
    });
    xit('should handle FunctionExpression', async function () {
        assert(await exec('(function(){ return 1; })()') === 1);
    });
    it('should handle Identifier', async function () {
        assert(await exec('foo', {foo: 555}) === 555);
    });
    it('should handle Literal', async function () {
        assert(await exec('0x00') === 0);
        assert(await exec('0xff') === 255);
        assert(await exec('1') === 1);
        assert(await exec('3.14') === 3.14);
        assert(await exec('-3.14') === -3.14);
        assert(await exec('"Hello"') === 'Hello');
        assert(await exec('true') === true);
        assert(await exec('false') === false);
        assert(await exec('null') === null);
    });
    it('should handle LogicalExpression', async function () {
        assert(await exec('1&&2') === 2);
        assert(await exec('1||2') === 1);
        assert(await exec('1<2') === true);
        assert(await exec('1>2') === false);
        assert(await exec('1<=2') === true);
        assert(await exec('1>=2') === false);
        assert(await exec('1==2') === false);
        assert(await exec('1!=2') === true);
        assert(await exec('1===1') === true);
        assert(await exec('1===2') === false);
        assert(await exec('1!==1') === false);
        assert(await exec('1!==2') === true);
    });
    it('should handle MemberExpression', async function () {
        assert(await exec('foo.bar', {foo: {bar: 555}}) === 555);
    });
    it('should handle ObjectExpression', async function () {
        assert.deepEqual(await exec('({a:1,b:2})'), {a: 1, b: 2});
    });
    xit('should handle ReturnStatement', async function () {
        assert.deepEqual(await exec('(function () { return 555; })') === 555);
    });
    it('should handle TaggedTemplateExpression', async function () {
        assert(await exec('tagged_templ`a=${11}b=${22}`', {tagged_templ}) === 'a=[11]b=[22]');
        function tagged_templ(strings, ...values) {
            return values.map((v,i) => `${strings[i]}[${v}]`).join('') + strings[values.length];
        }
    });
    it('should handle TemplateElement', async function () {
        assert(await exec('`foo`') === 'foo');
        assert(await exec('`foo${555}`') === 'foo555');
        assert(await exec('`foo${555}bar`') === 'foo555bar');
    });
    it('should handle TemplateLiteral', async function () {
        assert(await exec('`foo`') === 'foo');
        assert(await exec('`foo${555}`') === 'foo555');
        assert(await exec('`foo${555}bar`') === 'foo555bar');
    });
    it('should handle ThisExpression', async function () {
        assert(await exec('this', {this: 555}) === 555);
    });
    it('should handle UnaryExpression', async function () {
        assert(await exec('-5') === -5);
        assert(await exec('+8') === 8);
    });
});

function exec(code, vars)
{
    const ast = esprima.parse(code);
    const ast_expr = ast.body[0].expression;
    return static_eval_async(ast_expr, vars);
}

function pow(a, b)
{
    return Math.pow(a, b);
}

function pow_async(a, b)
{
    return new Promise(function (resolve) {
        resolve(Math.pow(a, b));
    });
}
