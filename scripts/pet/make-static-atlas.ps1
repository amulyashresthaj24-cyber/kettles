param(
  [Parameter(Mandatory = $true)]
  [string]$Source,

  [Parameter(Mandatory = $true)]
  [string]$Out,

  [int]$CellWidth = 192,
  [int]$CellHeight = 208,
  [int]$Cols = 8,
  [int]$Rows = 9,
  [int]$Padding = 10,
  [int]$GreenTolerance = 42
)

Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public static class FlowmatePetAtlasBuilder
{
    public static string Build(string sourcePath, string outPath, int cellWidth, int cellHeight, int cols, int rows, int padding, int greenTolerance)
    {
        using (var source = new Bitmap(sourcePath))
        using (var clean = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb))
        {
            int minX = source.Width;
            int minY = source.Height;
            int maxX = -1;
            int maxY = -1;

            for (int y = 0; y < source.Height; y++)
            {
                for (int x = 0; x < source.Width; x++)
                {
                    Color c = source.GetPixel(x, y);
                    if (IsGreenScreen(c, greenTolerance))
                    {
                        clean.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0));
                    }
                    else
                    {
                        clean.SetPixel(x, y, Color.FromArgb(c.A, c.R, c.G, c.B));
                        if (x < minX) minX = x;
                        if (y < minY) minY = y;
                        if (x > maxX) maxX = x;
                        if (y > maxY) maxY = y;
                    }
                }
            }

            if (maxX < 0 || maxY < 0) throw new InvalidOperationException("No mascot pixels found after green-screen cleanup.");

            Rectangle crop = new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1);
            using (var atlas = new Bitmap(cellWidth * cols, cellHeight * rows, PixelFormat.Format32bppArgb))
            using (var graphics = Graphics.FromImage(atlas))
            {
                graphics.Clear(Color.FromArgb(0, 0, 0, 0));
                graphics.InterpolationMode = InterpolationMode.NearestNeighbor;
                graphics.PixelOffsetMode = PixelOffsetMode.Half;

                int maxW = cellWidth - (padding * 2);
                int maxH = cellHeight - (padding * 2);
                double scale = Math.Min((double)maxW / crop.Width, (double)maxH / crop.Height);
                int drawW = Math.Max(1, (int)Math.Round(crop.Width * scale));
                int drawH = Math.Max(1, (int)Math.Round(crop.Height * scale));

                for (int row = 0; row < rows; row++)
                {
                    for (int col = 0; col < cols; col++)
                    {
                        int dx = (col * cellWidth) + (int)Math.Round((cellWidth - drawW) / 2.0);
                        int dy = (row * cellHeight) + (int)Math.Round((cellHeight - drawH) / 2.0);
                        Rectangle dest = new Rectangle(dx, dy, drawW, drawH);
                        graphics.DrawImage(clean, dest, crop, GraphicsUnit.Pixel);
                    }
                }

                atlas.Save(outPath, ImageFormat.Png);
            }

            return String.Format("Atlas: {0}x{1}, cell: {2}x{3}, source crop: {4}x{5}", cellWidth * cols, cellHeight * rows, cellWidth, cellHeight, crop.Width, crop.Height);
        }
    }

    private static bool IsGreenScreen(Color color, int tolerance)
    {
        bool brightGreen = color.G > 160
            && color.R < (90 + tolerance)
            && color.B < (90 + tolerance)
            && (color.G - color.R) > (80 - Math.Min(tolerance, 70))
            && (color.G - color.B) > (80 - Math.Min(tolerance, 70));

        bool greenFringe = color.G > 72
            && color.G > color.R * 1.35
            && color.G > color.B * 1.35
            && (color.G - Math.Max(color.R, color.B)) > 28;

        return brightGreen || greenFringe;
    }
}
"@

function New-DirectoryForFile([string]$Path) {
  $dir = Split-Path -Parent $Path
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
}

function Is-GreenScreen([System.Drawing.Color]$Color, [int]$Tolerance) {
  return (
    $Color.G -gt 160 -and
    $Color.R -lt (90 + $Tolerance) -and
    $Color.B -lt (90 + $Tolerance) -and
    ($Color.G - $Color.R) -gt (80 - [Math]::Min($Tolerance, 70)) -and
    ($Color.G - $Color.B) -gt (80 - [Math]::Min($Tolerance, 70))
  )
}

New-DirectoryForFile $Out

$sourcePath = (Resolve-Path -LiteralPath $Source).Path
$outPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Out)
$summary = [FlowmatePetAtlasBuilder]::Build($sourcePath, $outPath, $CellWidth, $CellHeight, $Cols, $Rows, $Padding, $GreenTolerance)

Write-Output "Created static seed atlas: $Out"
Write-Output $summary
