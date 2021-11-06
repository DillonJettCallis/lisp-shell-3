# Lisp Shell
A shell language based on lisp rather than bash.

## Installing
1. Install node.js recommended version
2. Clone this repo
3. Install dependencies
    1. The recommended tool is `pnpm`
        1. `npm install -g pnpm`
        2. `pnpm install`
    2. Yarn or npm should work too
        1. `yarn`
    3. npm
        1. `npm install`
4. Build
    1. `pnpm build`
        1. or `npm run build`
5. Run
    1. `pnpm start`
        1. or `npm start`


## Basic Usage
By default, the shell will import your environment variables and your path
and all command line programs will be available and mostly work the same.

```
C:\Users\Userx\lisp-shell
λ ls
$result0:
build
node_modules
package.json
pnpm-lock.yaml
README.md
src 
test
tsconfig.json
```

```
C:\Users\Userx\lisp-shell
λ cd ..

C:\Users\Userx
λ cd lisp-shell

C:\Users\Userx\lisp-shell
λ 
```

```
C:\Users\Userx\lisp-shell
λ git status
$result1:
On branch master
Your branch is up to date with 'origin/master'.

nothing to commit, working tree clean
```

You will notice any command that returns some result will output `$result[number]:`.
That means the command's return value is now available in a variable with that name.

```
C:\Users\Userx\lisp-shell
λ echo $result1
On branch master
Your branch is up to date with 'origin/master'.

nothing to commit, working tree clean
```

### A NOTE
From here on, we'll omit the directory name and result variables for the sake of readability,
unless it's necessary to demonstrate the functionality.

By default, all executed programs will have their std err directed to the console and
their std out captured in a string that will be stored in a variable.

By default, any command line call that returns an error code that is not zero will
throw an error.

We'll get to more on calling command line programs later.


## Variables
All variables must be prefixed with '$' UNLESS they are at the beginning of an expression.
The reason for this is so that unprefixed words can be treated as strings.

Declare a persistent variable with `def`

```
λ def $greeting 'Hello'

λ echo $greeting 'world!'
Hello world!
```

A word that begins with a digit is parsed as a number. 

```
λ def $pi 3.14
```

The words `null`, `true` and `false` are literals, everything else is considered a string.

This is just as valid as with quotes. 
```
λ def $greeting Hello

λ echo $greeting world!
Hello world!
```

A string can have digits or $s, it just can't begin with one. 
```
λ def $greeting Hello0

λ echo $greeting world$!
Hello0 world$!
```

The only characters not allowed inside an unquoted string are whitespace, braces `()[]{}`, quotes,
or escape characters.
```
λ def $greeting Hello\n

λ echo $greeting world!
Hello\n world!
```

This is an example of something that starts with a digit, but is not in fact a number and so will
cause an error.

```
λ git checkout 7305588db41a84187aecc4dfdef85ff31c45707c
Expected number but found d at 1:20 in repl input 0
```

If it begins with a digit, the shell assumes it must be a number and will fail if it
can't parse a valid number. To solve this, simply add quotes.

```
λ git checkout '7305588db41a84187aecc4dfdef85ff31c45707c'
```

Quoted and unquoted strings are mostly treated identically, and they won't make a difference
to any shell command that you execute.

```
λ git 'checkout' "master"
```

This however, is not.
```
λ git 'checkout master'
git: 'checkout master' is not a git command. See 'git --help'.
```

Putting the quotes around both words makes git think we're trying to pass
a single argument named 'checkout master' which it's never heard of.

Of course, often that's exactly what you want.

```
λ git commit -m "This is a short git commit message."
```

### A note on quotes
The shell respects single '', double "", and backtick quotes `` equally.
They all work EXACTLY the same, so you can use whatever you prefer and
each of them can contain the others without escaping. This makes it easier to
pass quoted content to commands.

```
λ node -e `const aString = 'With single quotes'; console.log(aString + " and double quotes ");`
$result0:
With single quotes and double quotes
```

Quoted strings are allowed escape characters. The currently supported escapes are:
| Escape | Result |
| --- | --- |
| `\n` | newline |
| `\r` | carriage return |
| `\t` | tab |
| `\s` | space |
| `\$` | $ |
| `\\` | \ |

So if, say, you had a string that really did begin with a $ you would do this:
```
λ echo "\$dollar"
$dollar
```


## String interpolation
All variables begin with a $, even when included inside a string.

```
λ def $greeting Hello

λ echo "$greeting world!"
Helo world!
```

You can also use a full expression inside a string using parens.
Note that the contents are called as a function.

```
λ echo "The answer is: $(+ 2 5)"
The answer is: 7
```

The following is not valid because $greeting is not a function.

```
λ def $greeting Hello

λ echo "$($greeting) world!"
Not callable. Type is string at 1:9 in repl input 2
```

Interpolation only occurs inside quoted strings.
A bare word can have a $ inside it, as long as it's not at the
beginning.

```
λ def $target world

λ echo hello$target
hello$target
```


## Math
The shell supports basic number and mathematical expressions on them.

```
λ + 2 1
3

λ * 2 3
6
```

Time to get into the actual syntax. The shell works as a lisp,
which if you're not familiar takes a while to get used it.
In a lisp, a function call is wrapped by parentheses, the first 
item is the function, the rest are the arguments.

`+ is the function, 2 and 3 are it's arguments.`
```
(+ 2 3)
```

This can be nested as deep as needed.

```
λ + 5 (* 8 (/ 4 2))
21
```

The built-in operators are +, *, -, and /.
Please note that - ONLY does subtraction, not negation. 
To do that you need to use `neg`.

```
λ + 5 (neg 8)
-3
```

### Auto expression note
The shell will automatically put an open and close parentheses
around everything you type into the shell. Putting your own
explicitly is an error.

```
λ (+ 5 (neg 8))
Not callable. Type is number at 1:1 in repl input 0
```

Correct

```
λ + 5 (neg 8)
$result0: -3
```

## Auto variable
Inside `()` the first value must always be a function, nothing else is valid. 
To make using the shell easier, the first bare word in parens is always 
converted into a variable, even without the $. However, adding one explicitly is always legal. 

```
λ $def $test 5

λ $+ 4 ($* 8 2)
```

There are no true 'operators' or 'keywords', all the core syntax features of the language
are just functions, and you can always access them by using a $. This is useful when you 
get to higher order functions and might need to pass basic functions around.

Auto variables also work in a few other places where code is transformed inside the parser.
I'll try to always call out those few places.

## Functions
You can define your own functions with `fn`

```
λ def $sum (fn [$x $y] (+ $x $y))

λ sum 4 5
9
```

The `fn` is followed by square brackets `[]` containing the parameter names. After that 
is the body, which is usually a function call and so is inside parens, but not always. 

```
λ def $justPi (fn [] 3.14)

λ justPi
3.14
```

Creating a function and then assigning it to a variable is so common, there is a shorthand for it.

```
λ defn $justPi [] 3.14

λ justPi
3.14
```

The `defn` acts just like a `def` and a `fn` separately.

There is an even shorter syntax for a lambda function, a function with no name and no 
named parameters. That starts with simply a \.

```
λ def $justPi (\ do 3.14)

λ justPi
3.14
```

In any function, not just a lambda, you can use $digit to access any parameters, even 
ones not named. $0 will return a list of all parameters. 

```
λ def $sum (\ + $1 $2)

λ sum 4 5
9
```

Remember back in the [Auto Variable](#auto-variable) section when I said that there are a few 
other places where auto variables work? Lambdas are one of them. The first item after a \ 
is transformed into a function call position and so will automatically be turned into a variable.

This means a lambda of the form `(\ 0)` is illegal, as 0 is not a function. To solve these cases,
I recommend using `do` as I did above. `(\ do 0)` we'll get into `do` later, but for now it's a
function that doesn't actually, well, do anything.

An example of $0

```
λ def $toList (\ do $0)

λ toList 4 5
[ 4, 5 ]
```

## Lists
The list package contains functions for interacting with lists. 
A list is an ordered array of data. Lists cannot be modified, and all 
modifying functions instead return a new list with the change applied. 

A list can also be declared simply by putting values inside square brackets: `[]`

```
λ do [1, 2]
[ 1, 2 ]
```

Some basic list use. All list functions take a list as the first argument. 
Lists are index starting at 0.

Get the first element from the list
```
λ list/get [1, 2] 0
1
```

Set the first element in the list. Note that the list is not changed, a new list is returned.
```
λ list/set [1, 2] 0 5
[ 5, 2 ]
```

Size only accepts a list and returns the number of items.
```
λ list/size [1, 2]
2
```

Now to pull it all together, we can cal about higher order functions. 
There are functions that accept other functions as input.

The `list/map` function takes a list and a function. The function
is called for every item in the list, and the results are used to make
a new list. In this example, we take a list of numbers and double each of them.
```
λ list/map [1, 2, 3, 4] (\ * $1 2)
[ 2, 4, 6, 8 ]
```

Sometimes you want to produce a new list for each item, and then merge all these 
lists together into a single list. That's what `list/flatMap` does.
```
λ list/flatMap [1, 2, 3, 4] (\ do [$1 (* $1 2)])
[ 1, 2, 2, 4, 3, 6, 4, 8 ]
```

To process over a list and produce a single result, use `list/fold`.
It takes a list and a starting value in addition to a function. 
The function is called with the initial value as the first argument and the 
next item as the second argument. The result is then passed as the first 
argument along with the second item, repeat until the list is exhausted and the 
final result is returned. 

In this example, we have our list, and starting with 0, we add up all the 
numbers until we come to the total of 10.
```
λ list/fold [1, 2, 3, 4] 0 (fn [$total, $next] (+ $total $next))
10
```

With the lambda syntax, this can be shortened to
```
λ list/fold [1, 2, 3, 4] 0 (\ + $1 $2))
10
```

And if we realize that + is just a function all on its own, we can reduce that further to.
```
λ list/fold [1, 2, 3, 4] 0 $+)
10
```

But don't worry if it takes you a while to get used to higher order functions like that. 
There is no shame in using `fn` functions to make the code easier to understand.

### Special functions

The following are special functions that CAN NOT be used as higher order
functions. (You can try, but they won't work)

1. def
2. defn
3. fn
4. let
5. try
   1. catch
   2. finally
6. export

The following are also special forms that CAN be used as higher order
functions, but won't work the same way you'd expect.

1. if
2. and
3. or

All of these come with lazy evaluation that won't work if used in a
higher order context. `and` and `or` won't short circuit, and `if`
will also run both the 'then' and 'else' expressions before choosing one.
