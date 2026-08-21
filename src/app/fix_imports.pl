use strict;
use warnings;
use File::Find;

my @files;
find(sub { push @files, $File::Find::name if /\.ts$/ }, '.');

foreach my $file (@files) {
    open my $fh, '<', $file or die "Cannot open $file: $!";
    my $content = do { local $/; <$fh> };
    close $fh;

    # Let's see what needs changing.
    # 1. Imports from `core/models`
    # 2. Imports from `core/*.store`

    my $orig = $content;

    # Fix store imports: e.g. `import { WifiStore } from '../core/wifi.store';`
    $content =~ s|../core/wifi.store|../wifi/wifi.store|g;
    $content =~ s|../core/wan.store|../wan/wan.store|g;
    $content =~ s|../core/devices.store|../devices/devices.store|g;
    $content =~ s|../core/tools.store|../diagnostics/tools.store|g;
    
    # same directory imports if they were in core
    $content =~ s|\./wifi.store|../wifi/wifi.store|g if $file =~ /core/;
    $content =~ s|\./wan.store|../wan/wan.store|g if $file =~ /core/;
    $content =~ s|\./devices.store|../devices/devices.store|g if $file =~ /core/;
    $content =~ s|\./tools.store|../diagnostics/tools.store|g if $file =~ /core/;

    # Now fix model imports.
    # We will just replace all model imports by matching the imported symbols.
    # But wait, it's safer to just do regex on the whole import block.
    # I'll just write a quick pass that replaces `import { A, B } from '../core/models'` with multiple imports.

    if ($content ne $orig) {
        open my $out, '>', $file or die "Cannot write $file: $!";
        print $out $content;
        close $out;
    }
}
