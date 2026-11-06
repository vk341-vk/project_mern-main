function Home(){
    return(
        <div>
            <h1><div id="carouselStacked" class="carousel slide">
  <div class="d-flex justify-content-between align-items-center">
    <h5 class="mb-0">Top controls</h5>
    <div>
      <button class="btn-icon btn-sm" type="button" data-bs-target="#carouselStacked" data-bs-slide="prev">
        <span class="carousel-icon-prev" aria-hidden="true"></span>
        <span class="visually-hidden">Previous</span>
      </button>
      <button class="btn-icon btn-sm" type="button" data-bs-target="#carouselStacked" data-bs-slide="next">
        <span class="carousel-icon-next" aria-hidden="true"></span>
        <span class="visually-hidden">Next</span>
      </button>
    </div>
  </div>
  <div class="carousel-inner rounded-5">
    <div class="carousel-item active">
      <img src="c:\Users\varun\Downloads\MS_Dhoni_(Prabhav_'23_-_RiGI_2023).jpg" class="d-block w-100" alt="..."></img>
    </div>
    <div class="carousel-item">
      <img src="c:\Users\varun\Downloads\thala.webp" class="d-block w-100" alt="..."></img>
    </div>
    <div class="carousel-item">
      <img src="c:\Users\varun\Downloads\thala.webp" class="d-block w-100" alt="..."></img>
    </div>
  </div>
</div></h1>
        </div>
    )
}
export default Home