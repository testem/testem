ent
===

Encode and decode HTML entities

example
=======

    var ent = require('ent');
    console.log(ent.encode('<span>©moo</span>'))
    console.log(ent.decode('&pi; &amp; &rho;'));

output:

    &lt;span&gt;&copy;moo&lt;/span&gt;
    π & ρ

methods
=======

encode(str)
-----------

Escape unsafe characters in `str` with html entities.

decode(str)
-----------

Convert html entities in `str` back to raw text.

credits
=======

HTML entity tables shamelessly lifted from perl's
[HTML::Entities](http://cpansearch.perl.org/src/GAAS/HTML-Parser-3.68/lib/HTML/Entities.pm)
