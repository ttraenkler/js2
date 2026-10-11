# Current-main resolver review checkpoint

Sealed evidence: `evidence.tar.gz`; SHA256 in `evidence.sha256`.
All inner hashes and extraction were verified; original PR6590 historical
files, test, resolver and README remain exact. The packet preserves both the
rejected first custody epoch and the corrected full-input epoch.

Fixed main e5605c8c0f plus exact published75c982 checkpoint: paired69/69,
13 full observations,16 validated binaries and10 full memories exactly equal.
Canonical inventory0 with1907 tracked modules and3 nonmodules; exact omission
controls1/2/3 errors. Strict source/test and all scoped normal gates pass.
Normal Node25.9 default-heap build exits0. Original Node22 exit134 failures
remain archival. Normal commit hooks and exact-head CI are still pending.

Only the released two registry entries and existing resolver callback/import
are composed; current string-slice order and canonical metadata are preserved.
No native migration/retirement credit or PR6590/HOLD/queue action is claimed.
